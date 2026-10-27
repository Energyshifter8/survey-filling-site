"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import QuestionField, {
  chunkQuestions,
  isQuestionAnswered,
  type LocalAnswer,
  SELECTABLE_TYPES,
} from "@/components/QuestionField";
import type { QuestionWithRule } from "@/lib/api/types";
import { getFriendlyErrorMessage, isTokenExpiredError } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
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

const AUTO_ADVANCE_DELAY_MS = 350;

const FAST_ANSWER_WINDOW = 4;
const FAST_ANSWER_THRESHOLD_MS = 3000;

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
                <QuestionField
                  question={question}
                  number={globalIndex + 1}
                  answer={answers[question.id]}
                  fontLevel={fontLevel}
                  onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                  onMultiToggle={(optionId) => handleMultiToggle(question, optionId)}
                  onTextChange={(text) => handleTextChange(question, text)}
                />
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

function StatusScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-16 text-center">
      <div className="max-w-120 leading-relaxed text-[#5b5b6b]">{children}</div>
    </main>
  );
}
