"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BODY_SIZE_CLASSES, META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import type { QuestionOptionDTO, QuestionType, QuestionWithRule } from "@/lib/api/types";
import { getFriendlyErrorMessage, isTokenExpiredError } from "@/lib/error-messages";
import { type FontSizeLevel, useFontSize } from "@/lib/font-size-context";
import { HELP_TEXT } from "@/lib/helptext";
import {
  clearSurveyProgress,
  clearSurveySession,
  loadSurveyMeta,
  loadSurveyProgress,
  saveSurveyProgress,
} from "@/lib/survey-session";
import { resolveSurveyTheme, surveyThemeCssVars } from "@/lib/survey-theme";
import { trackEvent } from "@/lib/telemetry";
import { useSurveyQuestions } from "@/lib/use-survey";

type LocalAnswer = { optionId?: number; optionIds?: number[]; text?: string };

// YES_NO/DROPDOWN — нэг action (товч дарах/сонголт хийх)-аар дуусдаг тул
// SINGLE_CHOICE/STAR_RATING/NUMBER_RATING-тай ижил auto-advance/canProceed
// зарчмыг хуваалцана (доорх handleSelect-ийг үз). TEXT/TEXT_INPUT/
// NUMBER_INPUT/LONG_TEXT энд ОРООГҮЙ — хэрэглэгч бичиж дуусахыг мэдэх
// арга байхгүй тул тэдгээрт auto-advance хэрэглэхгүй (доорх TEXT_TYPES-ийг үз).
const SELECTABLE_TYPES = new Set<QuestionType>(["SINGLE_CHOICE", "STAR_RATING", "NUMBER_RATING", "YES_NO", "DROPDOWN"]);
// Богино нэг мөрийн чөлөөт бичвэр хариулт (жишээ: нас — NUMBER_INPUT,
// амьдардаг улс — TEXT/TEXT_INPUT). LONG_TEXT (олон мөрийн textarea)-ыг
// тусад нь (доор) авч үзнэ, учир нь UI/character-counter өөр.
const TEXT_TYPES = new Set<QuestionType>(["TEXT", "TEXT_INPUT", "NUMBER_INPUT"]);
// AnswerChoice.content-ийн Swagger-ээр баталгаажсан max length (types.ts-ийг
// үз) — тухайн асуулт бүрийн dynamic max length талбар Swagger schema-д
// байхгүй тул (QuestionWithRule дээр ийм талбар алга) энэ submission-level
// 500-ийг л fallback болгож ашиглав.
const TEXTAREA_DEFAULT_MAX_LENGTH = 500;
const AUTO_ADVANCE_DELAY_MS = 350;

// YES_NO — Swagger-ээр батлагдсан тусдаа questionType (types.ts-ийг үз).
// Гэхдээ зарим судалгаа "Тийм"/"Үгүй" гэсэн 2 сонголттой асуултыг ЭНГИЙН
// SINGLE_CHOICE-ээр илгээж болзошгүй тул (тусдаа enum ашиглаагүй сан) —
// options.length === 2 && label яг "Тийм"/"Үгүй" үед л 2-товчийн YES_NO
// layout руу fallback хийнэ, бусад SINGLE_CHOICE энгийн радио хэвээр.
const YES_NO_LABELS = new Set(["тийм", "үгүй"]);
function isYesNoQuestion(question: QuestionWithRule): boolean {
  if (question.questionType === "YES_NO") return true;
  if (question.questionType !== "SINGLE_CHOICE") return false;
  const options = question.options ?? [];
  if (options.length !== 2) return false;
  return options.every((option) => YES_NO_LABELS.has(option.content.trim().toLowerCase()));
}

const FAST_ANSWER_WINDOW = 4;
const FAST_ANSWER_THRESHOLD_MS = 3000;

function sortByOrder(options: QuestionOptionDTO[] | undefined): QuestionOptionDTO[] {
  return [...(options ?? [])].sort((a, b) => a.order - b.order);
}

// confirmed 2026-09-04: survey.pageSize (Swagger + bodit browser тест —
// src/lib/api/types.ts-ийг үз)-аар асуултын массивыг батч болгон хуваана.
// Сүүлийн батч pageSize-аас богино байж болно. pageSize <= 0/тодорхойгүй бол
// 1 гэж үзнэ (frontend bundle-ийн `?? 1` fallback-тай ижил зарчим).
function chunkQuestions(questions: QuestionWithRule[], pageSize: number): QuestionWithRule[][] {
  const size = pageSize > 0 ? pageSize : 1;
  const batches: QuestionWithRule[][] = [];
  for (let i = 0; i < questions.length; i += size) {
    batches.push(questions.slice(i, i + size));
  }
  return batches;
}

// UI хараахан хийгдээгүй төрлийн (TEXT, MATRIX, ...) асуултыг блокдохгүй
// өнгөрөөнө — сонголт хийх боломж огт байхгүй үед "Үргэлжлүүлэх"-ийг мөнхөд
// хаачихаас сэргийлнэ (өмнөх ганц-асуултын canProceed-тэй ижил зарчим).
function isQuestionAnswered(question: QuestionWithRule, answers: Record<number, LocalAnswer>): boolean {
  if (question.questionType === "MULTI_CHOICE") {
    // decompiled bundle-ээр баталгаажсан (2026-09-07): min/max тодорхойгүй бол
    // 1/9999 гэж үзнэ.
    const count = answers[question.id]?.optionIds?.length ?? 0;
    const min = question.minAnswerCount ?? 1;
    const max = question.maxAnswerCount ?? 9999;
    return count >= min && count <= max;
  }
  if (TEXT_TYPES.has(question.questionType) || question.questionType === "LONG_TEXT") {
    if (!question.required) return true;
    return (answers[question.id]?.text ?? "").trim().length > 0;
  }
  if (!SELECTABLE_TYPES.has(question.questionType)) return true;
  return answers[question.id]?.optionId !== undefined;
}

export default function SurveyQuestionsPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  const { questions, loading, error, submit } = useSurveyQuestions(shortUrl);
  // /s/[shortUrl]/layout.tsx-ийн <FontSizeProvider>-ээс — intro/consent
  // хуудастай ижил (localStorage-д хадгалагдсан) фонт хэмжээг хуваалцана
  // (@/components/FontSizeToggle-ийн HEADING_SIZE_CLASSES/BODY_SIZE_CLASSES/
  // META_SIZE_CLASSES-ийг доор ашиглав).
  const { level: fontLevel } = useFontSize();

  // Судалгааны гарчиг ("Ажилтны сайн сайхан байдал" мэт) — асуулт бүр дээрх
  // category талбар БИШ (тийм зүйл байхгүй), харин survey.pages.START[0].title-ээс
  // ирдэг тул нэг л удаа intro хуудаснаас cache-лэгдсэн meta-аас уншина
  // (бүх асуултын дэлгэц дээр тогтмол header болгож харуулна). pageSize болон
  // theme (design.themeType) ч мөн адил энэ л meta-аас уншигдана.
  //
  // АНХААР (hydration): дээрх (surveyTitle/pageSize/themeVars) болон доорх
  // (currentBatchIndex/answers) бүгд өмнө нь useState lazy initializer дотор
  // шууд sessionStorage уншдаг байсан — server дээр (window байхгүй) үргэлж
  // хоосон/анхны утга буцаадаг ч client дээр (refresh хийхэд, progress аль
  // хэдийн хадгалагдсан бол) шууд бодит утга буцаадаг тул эхний render
  // server/client хооронд зөрж "Hydration failed" алдаа шидсэн (2026-09-03:
  // /s/[shortUrl]-д яг ижил шалтгаанаар тохиолдсоныг src/lib/use-survey.ts-ийн
  // useSurveyMeta-д зассан — энд ч мөн адил зарчмаар null/анхны утгаар
  // эхлээд, mount-ын client-only useEffect дотор л sessionStorage-аас уншина.
  const [surveyTitle, setSurveyTitle] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(1);
  const [themeVars, setThemeVars] = useState(() => surveyThemeCssVars(resolveSurveyTheme(undefined)));
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>({});
  const [scrollTargetId, setScrollTargetId] = useState<number | null>(null);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allQuestions = questions ?? [];
  const batches = chunkQuestions(allQuestions, pageSize);
  const totalBatches = batches.length;
  const currentBatch = batches[currentBatchIndex] ?? [];
  const batchProgress = totalBatches ? Math.round(((currentBatchIndex + 1) / totalBatches) * 100) : 0;
  const isLastBatch = currentBatchIndex === totalBatches - 1;
  const isFirstBatch = currentBatchIndex === 0;
  const isBatchMode = pageSize > 1;
  const canProceed = currentBatch.every((q) => isQuestionAnswered(q, answers));

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const meta = loadSurveyMeta(shortUrl);
    setSurveyTitle(meta?.survey.pages?.START?.[0]?.title);
    setPageSize(meta?.survey.pageSize && meta.survey.pageSize > 0 ? meta.survey.pageSize : 1);
    setThemeVars(surveyThemeCssVars(resolveSurveyTheme(meta?.survey.design)));
    const progress = loadSurveyProgress(shortUrl);
    if (progress) {
      setCurrentBatchIndex(progress.currentBatchIndex);
      setAnswers(progress.answers);
    }
  }, [shortUrl]);

  // Эхний mount дээр currentBatchIndex/answers аль хэдийн sessionStorage-аас
  // (эсвэл хоосон) уншигдсан утга тул тэрийг шууд буцаагаад бичих
  // шаардлагагүй — зөвхөн хэрэглэгч бодитоор сонголт хийж/батч солиход л
  // дахин бичнэ.
  const skipFirstPersistRef = useRef(true);
  useEffect(() => {
    if (done) return;
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    saveSurveyProgress(shortUrl, { currentBatchIndex, answers });
  }, [shortUrl, currentBatchIndex, answers, done]);

  const questionStartedAt = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `currentBatchIndex` intentionally resets the per-batch timer.
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [currentBatchIndex]);

  // Батч солигдоход (Үргэлжлүүлэх/Буцах хоёуланд адил) хуудсыг ЗААВАЛ эхэнд
  // нь тавина — эс тэгвэл өмнөх батчийн сүүлийн асуулт дээр байсан scroll
  // байрлал хэвээр үлдэж, шинэ батчийн сүүлийн асуулт дээр байгаа мэт
  // харагддаг байсан. Энэ бол шинэ context тул animation хэрэггүй, шууд.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `currentBatchIndex` intentionally resets scroll on every batch change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentBatchIndex]);

  // Auto-advance-ийн pending timer — батч солигдох бүрд (Буцах/Үргэлжлүүлэх/
  // auto-advance өөрөө) хуучин timer-ийг цуцалж, давхар шилжихээс сэргийлнэ.
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `currentBatchIndex` intentionally clears any pending timer on batch change.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, [currentBatchIndex]);

  useEffect(() => {
    if (scrollTargetId == null) return;
    questionRefs.current[scrollTargetId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollTargetId(null);
  }, [scrollTargetId]);

  // "Хурдан хариулагч" бурст илрүүлэлт: сүүлийн FAST_ANSWER_WINDOW ширхэг
  // "батч/асуултаас гарсан" timestamp-ыг rolling байдлаар хадгална (re-render
  // шаардлагагүй тул useState биш useRef). `warnedRef`-ээр нэг бурст дотор
  // давхар toast харуулахаас сэргийлнэ — хурд буурмагц (доорх else) дахин
  // false болгож, дараагийн шинэ бурст дээр дахин анхааруулж чадна.
  const answerTimestampsRef = useRef<number[]>([]);
  const fastBurstWarnedRef = useRef(false);
  function noteQuestionAdvanced() {
    const stamps = answerTimestampsRef.current;
    stamps.push(Date.now());
    if (stamps.length > FAST_ANSWER_WINDOW) stamps.shift();
    if (stamps.length < FAST_ANSWER_WINDOW) return;

    const span = stamps[stamps.length - 1] - stamps[0];
    if (span <= FAST_ANSWER_THRESHOLD_MS) {
      if (!fastBurstWarnedRef.current) {
        fastBurstWarnedRef.current = true;
        toast("Хариултаа тайвнаар бодоод сонгоорой", {
          description: "Сүүлийн хэдэн асуултад маш хурдан хариулж байна шиг байна.",
        });
      }
    } else {
      fastBurstWarnedRef.current = false;
    }
  }

  const isSessionExpired = error instanceof Error && error.message === "SESSION_EXPIRED";
  useEffect(() => {
    // getSurveyQuestions 401 буцаавал (token хугацаа дууссан) session/progress
    // аль хэдийн цэвэрлэгдсэн (useSurveyQuestions-д) — энд зөвхөн intro руу буцна.
    if (isSessionExpired) {
      router.replace(`/s/${shortUrl}`);
    }
  }, [isSessionExpired, router, shortUrl]);

  if (loading) {
    return <StatusScreen>Ачааллаж байна…</StatusScreen>;
  }

  if (error) {
    const isNoSession = error instanceof Error && error.message === "NO_SESSION";
    return (
      <StatusScreen>
        <p>
          {isSessionExpired
            ? "Судалгаанд орох хугацаа дууссан байна. Эхлэл рүү шилжиж байна…"
            : isNoSession
              ? "Судалгаанд орох session олдсонгүй эсвэл дууссан байна. Эхнээс дахин эхлүүлнэ үү."
              : getFriendlyErrorMessage(error, "authenticated")}
        </p>
        {!isSessionExpired && (
          <Link
            href={`/s/${shortUrl}`}
            className="mt-4 inline-block text-sm font-medium text-[#7c83fd] underline underline-offset-2"
          >
            Эхлэл рүү буцах
          </Link>
        )}
      </StatusScreen>
    );
  }

  if (!questions || questions.length === 0) {
    return <StatusScreen>Энэ судалгаанд асуулт олдсонгүй.</StatusScreen>;
  }

  if (done) {
    // router.replace(`/s/${shortUrl}/end`) аль хэдийн дуудагдсан — энэ бол зөвхөн
    // тухайн route шилжих богино зуурын transition (жинхэнэ "Баярлалаа" контент
    // /end route-д pages.END-ээс dynamic ирнэ).
    return <StatusScreen>Дуусгаж байна…</StatusScreen>;
  }

  function handleSelect(question: QuestionWithRule, optionId: number, indexInBatch: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));

    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);

    if (!isBatchMode) {
      if (!SELECTABLE_TYPES.has(question.questionType) || isLastBatch) return;
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        noteQuestionAdvanced();
        setCurrentBatchIndex((c) => c + 1);
      }, AUTO_ADVANCE_DELAY_MS);
      return;
    }

    if (indexInBatch >= currentBatch.length - 1) return;
    const nextQuestion = currentBatch[indexInBatch + 1];
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      noteQuestionAdvanced();
      setScrollTargetId(nextQuestion.id);
    }, AUTO_ADVANCE_DELAY_MS);
  }

  // decompiled bundle-ээр баталгаажсан (2026-09-07): дээд тооноос давахад
  // сонголт хориглогддоггүй, хамгийн эртнийхийг нь (FIFO) автоматаар арилгаад
  // шинийг нь нэмдэг. Auto-scroll/advance энд огт хэрэглэхгүй (мөн бодит
  // reference-ийн өөрийн scroll dispatcher нь MULTI_CHOICE-ыг ялангуяа
  // үл хамаарна гэж шууд бичсэн байгаа).
  function handleMultiToggle(question: QuestionWithRule, optionId: number) {
    setAnswers((prev) => {
      const current = prev[question.id]?.optionIds ?? [];
      const max = question.maxAnswerCount ?? 9999;
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : current.length >= max
          ? [...current.slice(1), optionId]
          : [...current, optionId];
      return { ...prev, [question.id]: { ...prev[question.id], optionIds: next } };
    });
  }

  // TEXT/TEXT_INPUT/NUMBER_INPUT/LONG_TEXT — auto-advance/auto-scroll ОГТ
  // хэрэглэхгүй (дээрх TEXT_TYPES-ийн comment-ийг үз), зөвхөн утгыг хадгална.
  function handleTextChange(question: QuestionWithRule, text: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], text } }));
  }

  function handlePrev() {
    if (isFirstBatch) return;
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    setCurrentBatchIndex((c) => Math.max(0, c - 1));
  }

  async function handleNext() {
    if (!canProceed) return;
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (!isLastBatch) {
      noteQuestionAdvanced();
      setCurrentBatchIndex((c) => c + 1);
      return;
    }
    noteQuestionAdvanced();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = Object.fromEntries(
        allQuestions.map((q) => [
          q.id,
          {
            optionId: answers[q.id]?.optionId,
            optionIds: answers[q.id]?.optionIds,
            content: answers[q.id]?.text,
            questionType: q.questionType,
            section: q.section,
            startedAt: questionStartedAt.current,
          },
        ]),
      );
      trackEvent("survey_submit_attempt", { shortUrl });
      await submit(payload);
      setDone(true);
      // Одоо бодит /end route руу шилжинэ (өмнө нь зөвхөн local "done" төлөв
      // харуулдаг байсныг өөрчилсөн) — тэнд pages.END-ийн гарчиг/тайлбар,
      // мөн (survey.hasAssessment бол) үр дүнгээ имэйлээр авах форм харагдана.
      // replace ашигласан нь буцах товчоор дуусгасан судалгаа руу дахин
      // орохоос сэргийлнэ (reference push ашигладаг ч энд зориудаар өөр).
      router.replace(`/s/${shortUrl}/end`);
    } catch (err) {
      // submitSurveyResponse — Bearer token-той дуудлага. Token хугацаа
      // дууссан бол (401 эсвэл 400+"хугацаа дууссан" message — isTokenExpiredError-ийг
      // үз) дахин оролдоход л ижил алдаа давтагдах тул шууд intro руу буцаана.
      if (isTokenExpiredError(err)) {
        clearSurveySession(shortUrl);
        clearSurveyProgress(shortUrl);
        toast.error("Судалгаанд орох хугацаа дууссан байна. Эхлэл рүү шилжиж байна…");
        router.replace(`/s/${shortUrl}`);
        return;
      }
      setSubmitError(getFriendlyErrorMessage(err, "authenticated"));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-[var(--survey-bg)] px-4 py-16" style={themeVars}>
      <div className="w-full max-w-140 space-y-8">
        <div className="space-y-2">
          {surveyTitle && (
            <p className={`font-medium text-[var(--survey-desc)] ${META_SIZE_CLASSES[fontLevel]}`}>{surveyTitle}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--survey-progress-bg)]">
              <div
                className="h-full rounded-full bg-[var(--survey-progress-active)] transition-[width] duration-200"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--survey-desc)]">{batchProgress}%</span>
          </div>
        </div>

        <div className="space-y-10">
          {currentBatch.map((question, indexInBatch) => {
            const globalIndex = currentBatchIndex * pageSize + indexInBatch;
            return (
              <div
                key={question.id}
                ref={(el) => {
                  questionRefs.current[question.id] = el;
                }}
                className="space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className={`font-medium leading-relaxed text-[var(--survey-text)] ${BODY_SIZE_CLASSES[fontLevel]}`}
                  >
                    {globalIndex + 1}. {question.content}
                    {question.required && <span className="ml-1 text-red-500">*</span>}
                  </h2>
                  {/* isRequired: false (bodit талбар: "required") — TEXTAREA/LONG_TEXT
                      дээр л screenshot-оор харагдсан "заавал биш" тайлбар. */}
                  {question.questionType === "LONG_TEXT" && !question.required && (
                    <span
                      className={`shrink-0 whitespace-nowrap italic text-[var(--survey-desc)] opacity-70 ${META_SIZE_CLASSES[fontLevel]}`}
                    >
                      {HELP_TEXT.optionalHint}
                    </span>
                  )}
                </div>

                {/* Төрлөөс үл хамааран (spec-ийн 6-р заалт): question.conditional
                    truthy үед л энэ мөрийг НЭГ Л УДАА энд render хийнэ — доорх
                    төрөл бүрийн branch-д давхардуулж бичихгүй. */}
                {question.conditional && (
                  <p className={`italic text-[var(--survey-desc)] opacity-70 ${META_SIZE_CLASSES[fontLevel]}`}>
                    {HELP_TEXT.conditionalHint}
                  </p>
                )}

                {isYesNoQuestion(question) ? (
                  <YesNoButtons
                    key={question.id}
                    options={question.options}
                    selectedId={answers[question.id]?.optionId}
                    onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                    fontLevel={fontLevel}
                  />
                ) : question.questionType === "SINGLE_CHOICE" ? (
                  <div className="space-y-2.5">
                    {sortByOrder(question.options).map((option) => {
                      const selected = answers[question.id]?.optionId === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-2 transition-colors ${
                            BODY_SIZE_CLASSES[fontLevel]
                          } ${
                            selected
                              ? "border-[var(--survey-option-border-active)] bg-[var(--survey-option-bg-active)] text-[var(--survey-option-text-active)]"
                              : "border-[var(--survey-option-border)] bg-[var(--survey-option-bg)] text-[var(--survey-option-text)]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            checked={selected}
                            onChange={() => handleSelect(question, option.id, indexInBatch)}
                            className="size-4 accent-[var(--survey-radio-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-radio-active)]"
                          />
                          <span>{option.content}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : question.questionType === "MULTI_CHOICE" ? (
                  <div className="space-y-2.5">
                    {question.minAnswerCount != null &&
                      question.maxAnswerCount != null &&
                      question.minAnswerCount !== question.maxAnswerCount && (
                        <p className={`text-[var(--survey-desc)] ${META_SIZE_CLASSES[fontLevel]}`}>
                          {HELP_TEXT.multiChoiceHintPrefix} {question.minAnswerCount} {HELP_TEXT.multiChoiceHintMid}{" "}
                          {question.maxAnswerCount} {HELP_TEXT.multiChoiceHintSuffix}
                        </p>
                      )}
                    {sortByOrder(question.options).map((option) => {
                      const selected = (answers[question.id]?.optionIds ?? []).includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-2 transition-colors ${
                            BODY_SIZE_CLASSES[fontLevel]
                          } ${
                            selected
                              ? "border-[var(--survey-option-border-active)] bg-[var(--survey-option-bg-active)] text-[var(--survey-option-text-active)]"
                              : "border-[var(--survey-option-border)] bg-[var(--survey-option-bg)] text-[var(--survey-option-text)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleMultiToggle(question, option.id)}
                            className="sr-only"
                          />
                          <CheckboxIcon checked={selected} />
                          <span>{option.content}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : question.questionType === "STAR_RATING" ? (
                  <StarRating
                    key={question.id}
                    options={question.options}
                    selectedId={answers[question.id]?.optionId}
                    onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                  />
                ) : question.questionType === "NUMBER_RATING" ? (
                  <NumberRating
                    key={question.id}
                    options={question.options}
                    selectedId={answers[question.id]?.optionId}
                    onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                  />
                ) : question.questionType === "DROPDOWN" ? (
                  <DropdownSelect
                    key={question.id}
                    options={question.options}
                    selectedId={answers[question.id]?.optionId}
                    onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                    fontLevel={fontLevel}
                  />
                ) : TEXT_TYPES.has(question.questionType) ? (
                  <input
                    type={question.questionType === "NUMBER_INPUT" ? "number" : "text"}
                    inputMode={question.questionType === "NUMBER_INPUT" ? "numeric" : undefined}
                    value={answers[question.id]?.text ?? ""}
                    onChange={(e) => handleTextChange(question, e.target.value)}
                    placeholder={HELP_TEXT.textInputPlaceholder}
                    className={`w-full rounded-lg border px-4 py-2.5 text-[var(--survey-text)] outline-none transition-colors placeholder:text-[var(--survey-desc)] ${
                      BODY_SIZE_CLASSES[fontLevel]
                    } ${
                      answers[question.id]?.text
                        ? "border-[var(--survey-input-border-filled)] bg-[var(--survey-input-bg-filled)]"
                        : "border-[var(--survey-input-border)] bg-[var(--survey-input-bg)] focus-visible:border-[var(--survey-input-border-focus)] focus-visible:bg-[var(--survey-input-bg-focus)] focus-visible:ring-2 focus-visible:ring-[var(--survey-input-border-focus)]/40"
                    }`}
                  />
                ) : question.questionType === "LONG_TEXT" ? (
                  <TextAreaWithCounter
                    value={answers[question.id]?.text ?? ""}
                    onChange={(text) => handleTextChange(question, text)}
                    maxLength={TEXTAREA_DEFAULT_MAX_LENGTH}
                    fontLevel={fontLevel}
                  />
                ) : (
                  // TODO: MATRIX гэх мэт бусад асуултын төрлийн UI хараахан хийгдээгүй.
                  <p className="text-sm italic text-[var(--survey-desc)]">
                    Энэ төрлийн асуултын ({question.questionType}) UI удахгүй нэмэгдэнэ.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isFirstBatch || submitting}
            onClick={handlePrev}
            className="rounded-lg border border-[var(--survey-back-btn-border)] px-7 py-3 text-[15px] font-medium text-[var(--survey-back-btn-text)] transition-colors hover:bg-[var(--survey-option-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-back-btn-border)]"
          >
            Буцах
          </button>
          <button
            type="button"
            disabled={!canProceed || submitting}
            onClick={handleNext}
            className="rounded-lg bg-[var(--survey-btn-bg)] px-7 py-3 text-[15px] font-medium text-[var(--survey-btn-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--survey-btn-disabled-bg)] disabled:text-[var(--survey-btn-disabled-text)] disabled:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-btn-bg)]"
          >
            {submitting ? "Илгээж байна…" : isLastBatch ? "Дуусгах" : "Үргэлжлүүлэх"}
          </button>
        </div>
      </div>
    </main>
  );
}

/** MULTI_CHOICE-ийн checkbox дүрс: сонгоогүй үед хоосон дугуйруулсан дөрвөлжин
 *  outline (`--survey-radio`), сонгосон үед `--survey-radio-active`-аар дүүрсэн
 *  дөрвөлжин доторх цагаан checkmark. Reference-ийн (decompiled bundle) нэг
 *  path-тай SVG-ийн оронд энд 2 дүрсийг ил тод давхарлав — харагдах үр дүн
 *  ижилхэн, гэхдээ энэ хувилбар илүү ойлгомжтой/засварлахад хялбар. */
function CheckboxIcon({ checked }: { checked: boolean }) {
  if (!checked) {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="size-6 shrink-0 text-[var(--survey-radio)]"
      >
        <path
          d="M18 19H6C5.45 19 5 18.55 5 18V6C5 5.45 5.45 5 6 5H18C18.55 5 19 5.45 19 6V18C19 18.55 18.55 19 18 19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="size-6 shrink-0 text-[var(--survey-radio-active)]"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
      <path
        d="M7.5 12.5l3 3 6-6.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Star rating: анхны төлөвт theme-ийн `--survey-star-border` outline, hover
 *  курсор хүрсэн од хүртэлх бүх од preview-ээр `--survey-star-active`-аар
 *  дүүрч харагдана, click хийхэд яг сонгосон од хүртэл бат дүүрнэ.
 *  `key={question.id}`-ээр асуулт солигдох бүрд шинээр mount хийгдэж hover
 *  төлөв цэвэрлэгдэнэ. */
function StarRating({
  options,
  selectedId,
  onSelect,
}: {
  options: QuestionOptionDTO[] | undefined;
  selectedId: number | undefined;
  onSelect: (optionId: number) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const sorted = sortByOrder(options);
  const selectedIndex = sorted.findIndex((option) => option.id === selectedId);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onMouseLeave only resets the hover preview; every real (click/keyboard) interaction lives on the child <button>s below.
    <div className="flex items-center gap-2" onMouseLeave={() => setHoverIndex(null)}>
      {sorted.map((option, index) => {
        const filled = hoverIndex !== null ? index <= hoverIndex : index <= selectedIndex;
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.content}
            aria-pressed={selectedId === option.id}
            onMouseEnter={() => setHoverIndex(index)}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex(null)}
            onClick={() => onSelect(option.id)}
            className="rounded transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-star-active)]"
          >
            {/* Дүрс зөвхөн чимэглэл — жинхэнэ шошго дээрх button-ий aria-label дээр аль хэдийн байгаа. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-9"
              style={{
                fill: filled ? "var(--survey-star-active)" : "none",
                stroke: filled ? "var(--survey-star-active)" : "var(--survey-star-border)",
              }}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path d="M12 2.5l2.94 6.32 6.81.9-4.95 4.72 1.24 6.86L12 17.9l-6.04 3.4 1.24-6.86-4.95-4.72 6.81-.9L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Numeric rating (1-5 Likert): screenshot-той тулгаад засав (2026-09-08) —
 *  өмнө нь дугуй (rounded-full), хоосон/idle үед хоосон дэвсгэртэй байсныг
 *  ЗАСАВ: одоо тэгш өнцөгт (rounded-lg) 5 товч нэг эгнээнд (flex-wrap-гүй),
 *  идэвхгүй үедээ `--survey-progress-bg`-ээр (theme-ийн бусад хэсэгт аль
 *  хэдийн "background-ээс бага зэрэг тодруулсан ил дэвсгэр" болгож ашигладаг
 *  progress track-ийн өнгө — доорх progress bar-тай ижил хувьсагч) бага зэрэг
 *  тодруулсан дэвсгэртэй, сонгогдвол SINGLE_CHOICE-ийн сонгогдсон сонголттой
 *  ИЖИЛ хос хувьсагчаар (`--survey-option-border-active` accent border +
 *  `--survey-option-bg-active`) тэмдэглэгдэнэ. */
function NumberRating({
  options,
  selectedId,
  onSelect,
}: {
  options: QuestionOptionDTO[] | undefined;
  selectedId: number | undefined;
  onSelect: (optionId: number) => void;
}) {
  const sorted = sortByOrder(options);

  return (
    <div className="flex items-center gap-2">
      {sorted.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.content}
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            className={`flex h-10 flex-1 shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-option-border-active)] ${
              selected
                ? "border-[var(--survey-option-border-active)] bg-[var(--survey-option-bg-active)] text-[var(--survey-option-text-active)]"
                : "border-[var(--survey-star-border)] bg-[var(--survey-progress-bg)] text-[var(--survey-text)] hover:border-[var(--survey-option-border-active)]"
            }`}
          >
            {option.order}
          </button>
        );
      })}
    </div>
  );
}

/** YES_NO (мөн 2-сонголттой SINGLE_CHOICE fallback, дээрх isYesNoQuestion-ийг
 *  үз): 2 тэгш өнцөгт товч хажуу хажуугаар нь (радио дугуй БИШ). Идэвхгүй
 *  үед зөвхөн border (дэвсгэргүй/transparent), сонгогдвол theme-ийн accent
 *  (`--survey-radio-active` — NumberRating-ийн `--survey-option-border-active`-тай
 *  ижлээр, эдгээр 2 хувьсагч theme бүрд ЯГ ИЖИЛ утгатай, доорх
 *  survey-theme.ts-ийг үз) өнгөөр бүрэн дүүрнэ. */
function YesNoButtons({
  options,
  selectedId,
  onSelect,
  fontLevel,
}: {
  options: QuestionOptionDTO[] | undefined;
  selectedId: number | undefined;
  onSelect: (optionId: number) => void;
  fontLevel: FontSizeLevel;
}) {
  const sorted = sortByOrder(options);

  return (
    <div className="flex gap-3">
      {sorted.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-radio-active)] ${
              BODY_SIZE_CLASSES[fontLevel]
            } ${
              selected
                ? "border-[var(--survey-radio-active)] bg-[var(--survey-radio-active)] text-[var(--survey-btn-text)]"
                : "border-[var(--survey-star-border)] text-[var(--survey-text)] hover:border-[var(--survey-radio-active)]"
            }`}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}

/** DROPDOWN: native `<select>` ашиглав (custom dropdown-оос хялбар, native
 *  popup нь browser өөрөө цагаан фон/харанхуй текстээр render хийдэг тул
 *  spec-ийн "цагаан фонтой, харанхуй текстэй жагсаалт" шаардлагыг нэмэлт
 *  ажилгүйгээр хангана). Утга сонгогдоогүй үед "Сонгох" placeholder (хоосон,
 *  disabled option), баруун талд зөвхөн чимэглэлийн chevron icon
 *  (`pointer-events-none`, select-ийн NATIVE сум дээр давхарлагдахгүй байхын
 *  тулд `appearance-none`-оор native сумыг нуув). */
function DropdownSelect({
  options,
  selectedId,
  onSelect,
  fontLevel,
}: {
  options: QuestionOptionDTO[] | undefined;
  selectedId: number | undefined;
  onSelect: (optionId: number) => void;
  fontLevel: FontSizeLevel;
}) {
  const sorted = sortByOrder(options);
  const filled = selectedId != null;

  return (
    <div className="relative">
      <select
        value={selectedId ?? ""}
        onChange={(e) => {
          if (e.target.value) onSelect(Number(e.target.value));
        }}
        className={`w-full cursor-pointer appearance-none rounded-lg border px-4 py-2.5 pr-10 text-[var(--survey-text)] outline-none transition-colors ${
          BODY_SIZE_CLASSES[fontLevel]
        } ${
          filled
            ? "border-[var(--survey-input-border-filled)] bg-[var(--survey-input-bg-filled)]"
            : "border-[var(--survey-input-border)] bg-[var(--survey-input-bg)] focus-visible:border-[var(--survey-input-border-focus)] focus-visible:bg-[var(--survey-input-bg-focus)] focus-visible:ring-2 focus-visible:ring-[var(--survey-input-border-focus)]/40"
        }`}
      >
        <option value="" disabled className="bg-white text-[#637389]">
          {HELP_TEXT.dropdownPlaceholder}
        </option>
        {sorted.map((option) => (
          <option key={option.id} value={option.id} className="bg-white text-[#10182B]">
            {option.content}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--survey-desc)]" />
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** LONG_TEXT (олон мөрийн чөлөөт бичвэр, ихэвчлэн заавал биш — доод баруун
 *  буланд тэмдэгтийн тоолуур ("0/500" маягаар). Асуултын гарчгийн "заавал
 *  биш" тайлбар (HELP_TEXT.optionalHint) дээрх render функц дотор (гарчгийн
 *  мөрөнд) харагдана, энд биш. */
function TextAreaWithCounter({
  value,
  onChange,
  maxLength,
  fontLevel,
}: {
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
  fontLevel: FontSizeLevel;
}) {
  const filled = value.length > 0;

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        rows={4}
        placeholder={HELP_TEXT.textInputPlaceholder}
        className={`w-full resize-none rounded-lg border px-4 py-2.5 pb-7 text-[var(--survey-text)] outline-none transition-colors placeholder:text-[var(--survey-desc)] ${
          BODY_SIZE_CLASSES[fontLevel]
        } ${
          filled
            ? "border-[var(--survey-input-border-filled)] bg-[var(--survey-input-bg-filled)]"
            : "border-[var(--survey-input-border)] bg-[var(--survey-input-bg)] focus-visible:border-[var(--survey-input-border-focus)] focus-visible:bg-[var(--survey-input-bg-focus)] focus-visible:ring-2 focus-visible:ring-[var(--survey-input-border-focus)]/40"
        }`}
      />
      <span className="absolute right-3 bottom-2 text-xs text-[var(--survey-desc)]">
        {value.length}/{maxLength}
      </span>
    </div>
  );
}

function StatusScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-16 text-center">
      <div className="max-w-120 leading-relaxed text-[#5b5b6b]">{children}</div>
    </main>
  );
}
