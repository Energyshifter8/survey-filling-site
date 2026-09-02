"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { loadSurveyProgress, saveSurveyProgress } from "@/lib/survey-session";
import { trackEvent } from "@/lib/telemetry";
import { useSurveyQuestions } from "@/lib/use-survey";

type LocalAnswer = { optionId?: number };

export default function SurveyQuestionsPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  const { questions, loading, error, submit } = useSurveyQuestions(shortUrl);

  // Refresh хийхэд асуулт 1-ээс дахин эхлэхгүй байхын тулд хадгалсан
  // progress-оор (байвал) эхлэл болгоно.
  const [current, setCurrent] = useState(() => loadSurveyProgress(shortUrl)?.current ?? 0);
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>(
    () => loadSurveyProgress(shortUrl)?.answers ?? {},
  );
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (done) return;
    saveSurveyProgress(shortUrl, { current, answers });
  }, [shortUrl, current, answers, done]);

  const questionStartedAt = useRef(0);
  useEffect(() => {
    questionStartedAt.current = Date.now();
    // biome-ignore lint/correctness/useExhaustiveDependencies: `current` intentionally resets the per-question timer.
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
          <Link href={`/s/${shortUrl}`} className="mt-4 inline-block text-sm font-medium text-[#7c83fd] underline underline-offset-2">
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
    return (
      <StatusScreen>
        <h1 className="mb-2 text-2xl font-medium text-[#1a1a2e]">Баярлалаа!</h1>
        <p>Таны хариулт амжилттай илгээгдлээ.</p>
      </StatusScreen>
    );
  }

  const allQuestions = questions;
  const question = allQuestions[current];
  const progress = Math.round(((current + 1) / allQuestions.length) * 100);
  const isLast = current === allQuestions.length - 1;
  const isSingleChoice = question.questionType === "SINGLE_CHOICE";
  const canProceed = isSingleChoice ? answers[question.id]?.optionId !== undefined : true;

  function handleSelect(optionId: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));
  }

  async function handleNext() {
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
    } catch (err) {
      // submitSurveyResponse — Bearer token-той дуудлага.
      setSubmitError(getFriendlyErrorMessage(err, "authenticated"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-4 py-16">
      <div className="w-full max-w-140 space-y-8">
        <div className="h-1.5 rounded-full bg-[#eceef7]">
          <div
            className="h-full rounded-full bg-[#7c83fd] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h2 className="text-lg font-medium leading-relaxed text-[#1a1a2e]">
          {current + 1}. {question.content}
        </h2>

        {isSingleChoice ? (
          <div className="space-y-2.5">
            {(question.options ?? []).map((option) => {
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
        ) : (
          // TODO: SINGLE_CHOICE-с бусад асуултын төрлийн UI хараахан хийгдээгүй
          // (deliverable зөвхөн single-select урсгал шаардсан — PROMPT.md-ийг үз).
          <p className="text-sm italic text-[#5b5b6b]">
            Энэ төрлийн асуултын ({question.questionType}) UI удахгүй нэмэгдэнэ.
          </p>
        )}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="button"
          disabled={!canProceed || submitting}
          onClick={handleNext}
          className="rounded-lg bg-[#7c83fd] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#6870f0] disabled:cursor-not-allowed disabled:bg-[#c7c9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
        >
          {submitting ? "Илгээж байна…" : isLast ? "Дуусгах" : "Үргэлжлүүлэх"}
        </button>
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
