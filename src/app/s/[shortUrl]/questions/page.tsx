"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BODY_SIZE_CLASSES, META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import type { QuestionOptionDTO, QuestionType, QuestionWithRule } from "@/lib/api/types";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
import { loadSurveyMeta, loadSurveyProgress, saveSurveyProgress } from "@/lib/survey-session";
import { resolveSurveyTheme, surveyThemeCssVars } from "@/lib/survey-theme";
import { trackEvent } from "@/lib/telemetry";
import { useSurveyQuestions } from "@/lib/use-survey";

type LocalAnswer = { optionId?: number };

// Radio/star/тоон товч гэх мэт "ганц дархад л хариулт бүрэн тодорхой болдог"
// сонголтод суурилсан төрлүүд.
//   - pageSize === 1 үед (жишээ нь "Сэтгэлийн хат", survey.pageSize=1)
//     эдгээр дээр auto-advance хэрэглэнэ (2026-09-02, curl-ээр баталгаажсан).
//   - pageSize > 1 үед (батч горим, 2026-09-04: survey.pageSize confirmed via
//     Swagger + бодит browser тест — src/lib/api/types.ts-ийг үз) auto-advance
//     доор (isBatchMode) УНТАРНА, учир нь нэг дэлгэцэд олон асуулт зэрэг
//     харагддаг тул "дараагийн асуулт руу шилжих" гэдэг ойлголт өөрчлөгддөг.
//     Гэхдээ энэ багц нь "БҮГД required хариулагдсан эсэх" шалгалтад
//     (isQuestionAnswered) ямар ч тохиолдолд ХЭВЭЭР ашиглагдана.
// MULTI_CHOICE/TEXT/MATRIX гэх мэт чөлөөт/олон сонголттой төрлүүд эндээс
// зориудаар гадуур — UI хараахан хийгдээгүй (доорхыг үз).
const SELECTABLE_TYPES = new Set<QuestionType>(["SINGLE_CHOICE", "STAR_RATING", "NUMBER_RATING"]);
const AUTO_ADVANCE_DELAY_MS = 350;

// "Хурдан хариулагч" анхааруулга: сүүлийн N удаагийн "батч/асуулт солигдсон"
// мөч хамтдаа энэ хугацаанаас бага зайтай өгөгдвол — уншиж бодохгүйгээр
// дараалан дарж байгааг илтгэнэ. Backend рүү бичигдэхгүй, зөвхөн клиент
// талын нэг удаагийн зөөлөн nudge (доорх FAST_ANSWER_* тогтмолуудыг үз).
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

// UI хараахан хийгдээгүй төрлийн (MULTI_CHOICE, TEXT, ...) асуултыг блокдохгүй
// өнгөрөөнө — сонголт хийх боломж огт байхгүй үед "Үргэлжлүүлэх"-ийг мөнхөд
// хаачихаас сэргийлнэ (өмнөх ганц-асуултын canProceed-тэй ижил зарчим).
function isQuestionAnswered(question: QuestionWithRule, answers: Record<number, LocalAnswer>): boolean {
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
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Auto-advance-ийн pending timer — батч солигдох бүрд (Буцах/Үргэлжлүүлэх/
  // auto-advance өөрөө) хуучин timer-ийг цуцалж, давхар шилжихээс сэргийлнэ.
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `currentBatchIndex` intentionally clears any pending timer on batch change.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, [currentBatchIndex]);

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

  const allQuestions = questions;
  const batches = chunkQuestions(allQuestions, pageSize);
  const totalBatches = batches.length;
  const currentBatch = batches[currentBatchIndex] ?? [];
  const progress = Math.round(((currentBatchIndex + 1) / totalBatches) * 100);
  const isLastBatch = currentBatchIndex === totalBatches - 1;
  const isFirstBatch = currentBatchIndex === 0;
  // pageSize > 1 үед батч дотор олон асуулт зэрэг харагддаг тул auto-advance
  // (сонгосны дараа шууд дараагийн асуулт руу шилжих) утга учиргүй болдог —
  // доорхыг унтраана (SELECTABLE_TYPES-ийн бүлгийн comment-ийг үз).
  const isBatchMode = pageSize > 1;
  // "Үргэлжлүүлэх" зөвхөн тухайн батч дахь ХАМГИЙН БАГАДАА хариулах боломжтой
  // (SELECTABLE_TYPES) бүх асуулт хариулагдсан үед идэвхжинэ.
  const canProceed = currentBatch.every((q) => isQuestionAnswered(q, answers));

  function handleSelect(question: QuestionWithRule, optionId: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));

    // Сонгосон od/тоогоо хэрэглэгчид товчхон харуулаад (highlight), дараа нь
    // өөрөө дараагийн асуулт руу шилжинэ. Сүүлчийн батч дээр огт auto-submit
    // хийхгүй — "Дуусгах" товчийг хэрэглэгч өөрөө дарна. Батч горимд (доорх
    // isBatchMode) энэ auto-advance бүхэлдээ идэвхгүй.
    const isAutoAdvanceType = !isBatchMode && SELECTABLE_TYPES.has(question.questionType);
    if (isAutoAdvanceType && !isLastBatch) {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        noteQuestionAdvanced();
        setCurrentBatchIndex((c) => c + 1);
      }, AUTO_ADVANCE_DELAY_MS);
    }
  }

  function handlePrev() {
    if (isFirstBatch) return;
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    // `answers` state өөрчлөгдөхгүй тул өмнөх батч руу буцахад тэр батч дахь
    // асуултууд өөрсдийн хадгалагдсан хариултаа (сонгогдсон радио/од/тоогоор)
    // шууд дахин харуулна — нэмэлт ажил шаардлагагүй.
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
      // submitSurveyResponse — Bearer token-той дуудлага.
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
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--survey-desc)]">{progress}%</span>
          </div>
        </div>

        {/* Батч дахь БҮХ асуултыг НЭГ дор, дараалсан жагсаалтаар render хийнэ
            (survey.pageSize-ийн зорилго — src/lib/api/types.ts-ийг үз). */}
        <div className="space-y-10">
          {currentBatch.map((question, indexInBatch) => {
            const globalIndex = currentBatchIndex * pageSize + indexInBatch;
            return (
              <div key={question.id} className="space-y-4">
                <h2 className={`font-medium leading-relaxed text-[var(--survey-text)] ${BODY_SIZE_CLASSES[fontLevel]}`}>
                  {globalIndex + 1}. {question.content}
                  {question.required && <span className="ml-1 text-red-500">*</span>}
                </h2>

                {question.questionType === "SINGLE_CHOICE" ? (
                  <div className="space-y-2.5">
                    {sortByOrder(question.options).map((option) => {
                      const selected = answers[question.id]?.optionId === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 transition-colors ${
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
                            onChange={() => handleSelect(question, option.id)}
                            className="size-4 accent-[var(--survey-radio-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-radio-active)]"
                          />
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
                    onSelect={(optionId) => handleSelect(question, optionId)}
                  />
                ) : question.questionType === "NUMBER_RATING" ? (
                  <NumberRating
                    key={question.id}
                    options={question.options}
                    selectedId={answers[question.id]?.optionId}
                    onSelect={(optionId) => handleSelect(question, optionId)}
                  />
                ) : (
                  // TODO: MULTI_CHOICE/DROPDOWN/YES_NO/MATRIX/TEXT гэх мэт бусад
                  // асуултын төрлийн UI хараахан хийгдээгүй (энэ судалгаанд
                  // гараагүй, deliverable зөвхөн SINGLE_CHOICE/STAR_RATING/
                  // NUMBER_RATING шаардсан).
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

/** Numeric rating: ижил дизайны хэл — тоон товчнуудын эгнээ, анхны төлөвт
 *  `--survey-star-border` outline (тусдаа numeric-specific өнгө theme-д
 *  байхгүй тул star rating-тай ижил хувьсагчийг дахин ашиглав), сонгогдвол
 *  `--survey-star-active`-аар дүүрнэ. */
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
    <div className="flex flex-wrap items-center gap-2">
      {sorted.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.content}
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-star-active)] ${
              selected
                ? "border-[var(--survey-star-active)] bg-[var(--survey-star-active)] text-[var(--survey-btn-text)]"
                : "border-[var(--survey-star-border)] text-[var(--survey-text)] hover:border-[var(--survey-star-active)]"
            }`}
          >
            {option.order}
          </button>
        );
      })}
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
