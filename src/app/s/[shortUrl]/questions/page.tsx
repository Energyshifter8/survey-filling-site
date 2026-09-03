"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import type { QuestionOptionDTO, QuestionType } from "@/lib/api/types";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { loadSurveyMeta, loadSurveyProgress, saveSurveyProgress } from "@/lib/survey-session";
import { trackEvent } from "@/lib/telemetry";
import { useSurveyQuestions } from "@/lib/use-survey";

type LocalAnswer = { optionId?: number };

// SINGLE_CHOICE/STAR_RATING/NUMBER_RATING — ганц дарахад л хариулт бүрэн
// тодорхой болдог төрлүүд (2026-09-02, curl-ээр баталгаажсан бодит survey
// response-оор: 1 "page" = 1 асуулт (survey.pageSize=1) тул эдгээр төрөл дээр
// auto-advance-ыг нөхцөлгүйгээр хэрэглэж болно — src/lib/api/types.ts-ийг үз).
// MULTI_CHOICE/TEXT/MATRIX гэх мэт чөлөөт/олон сонголттой төрлүүд эндээс
// зориудаар гадуур — тэдгээр дээр хэрэглэгч гараар "Үргэлжлүүлэх" дарна.
const AUTO_ADVANCE_TYPES = new Set<QuestionType>(["SINGLE_CHOICE", "STAR_RATING", "NUMBER_RATING"]);
const AUTO_ADVANCE_DELAY_MS = 350;

function sortByOrder(options: QuestionOptionDTO[] | undefined): QuestionOptionDTO[] {
  return [...(options ?? [])].sort((a, b) => a.order - b.order);
}

export default function SurveyQuestionsPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  const { questions, loading, error, submit } = useSurveyQuestions(shortUrl);

  // Судалгааны гарчиг ("Ажилтны сайн сайхан байдал" мэт) — асуулт бүр дээрх
  // category талбар БИШ (тийм зүйл байхгүй), харин survey.pages.START[0].title-ээс
  // ирдэг тул нэг л удаа intro хуудаснаас cache-лэгдсэн meta-аас уншина
  // (бүх асуултын дэлгэц дээр тогтмол header болгож харуулна).
  const [surveyTitle] = useState(() => loadSurveyMeta(shortUrl)?.survey.pages?.START?.[0]?.title);

  // Refresh хийхэд асуулт 1-ээс дахин эхлэхгүй байхын тулд хадгалсан
  // progress-оор (байвал) эхлэл болгоно.
  const [current, setCurrent] = useState(() => loadSurveyProgress(shortUrl)?.current ?? 0);
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>(
    () => loadSurveyProgress(shortUrl)?.answers ?? {},
  );
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Эхний mount дээр current/answers аль хэдийн sessionStorage-аас (эсвэл
  // хоосон) уншигдсан утга тул тэрийг шууд буцаагаад бичих шаардлагагүй —
  // зөвхөн хэрэглэгч бодитоор сонголт хийж/асуулт солиход л дахин бичнэ.
  const skipFirstPersistRef = useRef(true);
  useEffect(() => {
    if (done) return;
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    saveSurveyProgress(shortUrl, { current, answers });
  }, [shortUrl, current, answers, done]);

  const questionStartedAt = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `current` intentionally resets the per-question timer.
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [current]);

  // Auto-advance-ийн pending timer — асуулт солигдох бүрд (Буцах/Үргэлжлүүлэх/
  // auto-advance өөрөө) хуучин timer-ийг цуцалж, давхар шилжихээс сэргийлнэ.
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `current` intentionally clears any pending timer on question change.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, [current]);

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
  const question = allQuestions[current];
  const progress = Math.round(((current + 1) / allQuestions.length) * 100);
  const isLast = current === allQuestions.length - 1;
  const isFirst = current === 0;
  const isAutoAdvanceType = AUTO_ADVANCE_TYPES.has(question.questionType);
  const canProceed = isAutoAdvanceType ? answers[question.id]?.optionId !== undefined : true;

  function handleSelect(optionId: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));

    // Сонгосон od/тоогоо хэрэглэгчид товчхон харуулаад (highlight), дараа нь
    // өөрөө дараагийн асуулт руу шилжинэ. Сүүлчийн асуулт дээр огт
    // auto-submit хийхгүй — "Дуусгах" товчийг хэрэглэгч өөрөө дарна.
    if (isAutoAdvanceType && !isLast) {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrent((c) => c + 1);
      }, AUTO_ADVANCE_DELAY_MS);
    }
  }

  function handlePrev() {
    if (isFirst) return;
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    setCurrent((c) => Math.max(0, c - 1));
  }

  async function handleNext() {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (!isLast) {
      setCurrent((c) => c + 1);
      return;
    }
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
    <main className="flex flex-1 flex-col items-center bg-white px-4 py-16">
      <div className="w-full max-w-140 space-y-8">
        <div className="space-y-2">
          {surveyTitle && <p className="text-sm font-medium text-[#5b5b6b]">{surveyTitle}</p>}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[#eceef7]">
              <div
                className="h-full rounded-full bg-[#7c83fd] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[#5b5b6b]">{progress}%</span>
          </div>
        </div>

        <h2 className="text-lg font-medium leading-relaxed text-[#1a1a2e]">
          {current + 1}. {question.content}
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
                    selected ? "border-[#7c83fd] bg-[#f3f4ff]" : "border-[#dfe0ea]"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={selected}
                    onChange={() => handleSelect(option.id)}
                    className="size-4 accent-[#7c83fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
                  />
                  <span className="text-[#1a1a2e]">{option.content}</span>
                </label>
              );
            })}
          </div>
        ) : question.questionType === "STAR_RATING" ? (
          <StarRating
            key={question.id}
            options={question.options}
            selectedId={answers[question.id]?.optionId}
            onSelect={handleSelect}
          />
        ) : question.questionType === "NUMBER_RATING" ? (
          <NumberRating
            key={question.id}
            options={question.options}
            selectedId={answers[question.id]?.optionId}
            onSelect={handleSelect}
          />
        ) : (
          // TODO: MULTI_CHOICE/DROPDOWN/YES_NO/MATRIX/TEXT гэх мэт бусад
          // асуултын төрлийн UI хараахан хийгдээгүй (энэ судалгаанд гараагүй,
          // deliverable зөвхөн SINGLE_CHOICE/STAR_RATING/NUMBER_RATING шаардсан).
          <p className="text-sm italic text-[#5b5b6b]">
            Энэ төрлийн асуултын ({question.questionType}) UI удахгүй нэмэгдэнэ.
          </p>
        )}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isFirst || submitting}
            onClick={handlePrev}
            className="rounded-lg border border-[#dfe0ea] px-7 py-3 text-[15px] font-medium text-[#1a1a2e] transition-colors hover:bg-[#f3f4ff] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
          >
            Буцах
          </button>
          <button
            type="button"
            disabled={!canProceed || submitting}
            onClick={handleNext}
            className="rounded-lg bg-[#7c83fd] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#6870f0] disabled:cursor-not-allowed disabled:bg-[#c7c9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
          >
            {submitting ? "Илгээж байна…" : isLast ? "Дуусгах" : "Үргэлжлүүлэх"}
          </button>
        </div>
      </div>
    </main>
  );
}

/** Star rating: анхны төлөвт gray outline, hover курсор хүрсэн од хүртэлх
 *  бүх од preview-ээр periwinkle-ээр дүүрч харагдана, click хийхэд яг
 *  сонгосон од хүртэл бат дүүрнэ. `key={question.id}`-ээр асуулт солигдох
 *  бүрд шинээр mount хийгдэж hover төлөв цэвэрлэгдэнэ. */
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
            className="rounded transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
          >
            {/* Дүрс зөвхөн чимэглэл — жинхэнэ шошго дээрх button-ий aria-label дээр аль хэдийн байгаа. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-9"
              fill={filled ? "#7C83FD" : "none"}
              stroke={filled ? "#7C83FD" : "#9CA3AF"}
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
 *  gray outline, сонгогдвол periwinkle дүүрнэ. */
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
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd] ${
              selected
                ? "border-[#7C83FD] bg-[#7C83FD] text-white"
                : "border-[#9CA3AF] text-[#1a1a2e] hover:border-[#7C83FD]"
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
