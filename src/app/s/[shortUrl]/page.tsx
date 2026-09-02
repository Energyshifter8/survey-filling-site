"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { trackEvent } from "@/lib/telemetry";
import { startSurveySession, useSurveyMeta } from "@/lib/use-survey";

type Step = "intro" | "consent";

export default function SurveyLandingPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  const { meta, loading, error } = useSurveyMeta(shortUrl);

  const [step, setStep] = useState<Step>("intro");
  const [consented, setConsented] = useState(false);
  const [passCode, setPassCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) {
    return <StatusScreen>Судалгааг ачааллаж байна…</StatusScreen>;
  }

  if (error) {
    // resolveShortUrl / participateSurvey — Bearer token хараахан байхгүй үе.
    return <StatusScreen>{getFriendlyErrorMessage(error, "public")}</StatusScreen>;
  }

  if (!meta) return null;

  const { survey, taken } = meta;

  if (taken) {
    return (
      <StatusScreen>
        {survey.title ? `${survey.title} — ` : ""}
        Та энэ судалгааг өмнө нь бөглөсөн байна. Баярлалаа!
      </StatusScreen>
    );
  }

  if (survey.expired || survey.canParticipate === false) {
    return <StatusScreen>{survey.message ?? "Энэ судалгаа одоогоор оролцох боломжгүй байна."}</StatusScreen>;
  }

  const needsPassCode = Boolean(survey.passCodeProtected);
  const canContinue = consented && (!needsPassCode || passCode.trim().length > 0) && !starting;

  async function handleContinue() {
    if (!canContinue) return;
    setStarting(true);
    setStartError(null);
    try {
      trackEvent("survey_consent_given", { shortUrl });
      await startSurveySession(shortUrl, meta!.surveyId, needsPassCode ? passCode.trim() : undefined);
      router.push(`/s/${shortUrl}/questions`);
    } catch (err) {
      // checkPass — яг Bearer token олгож буй дуудлага, өөрөө Bearer шаарддаггүй.
      setStartError(getFriendlyErrorMessage(err, "public"));
      setStarting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-140">
        {step === "intro" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-medium text-[#1a1a2e] sm:text-3xl">{survey.title ?? "Судалгаанд оролцох"}</h1>
            {survey.description && <p className="leading-relaxed text-[#5b5b6b]">{survey.description}</p>}
            {survey.creator && (
              <p className="text-sm text-[#5b5b6b]">
                Судалгаа нийтлэгч: <span className="font-medium">{survey.creator}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep("consent")}
              className="rounded-lg bg-[#7c83fd] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#6870f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
            >
              Эхлэх
            </button>
          </div>
        )}

        {step === "consent" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-medium text-[#1a1a2e] sm:text-3xl">{survey.title}</h1>
            <p className="text-sm text-[#5b5b6b]">
              {survey.questionCount != null && `${survey.questionCount} асуулт`}
              {survey.questionCount != null && (survey.minMinutes || survey.maxMinutes) && " · "}
              {(survey.minMinutes || survey.maxMinutes) &&
                `${survey.minMinutes ?? "?"}-${survey.maxMinutes ?? "?"} минут`}
            </p>

            {needsPassCode && (
              <div className="space-y-2">
                <label htmlFor="passCode" className="text-sm font-medium text-[#1a1a2e]">
                  Нэвтрэх код
                </label>
                <input
                  id="passCode"
                  type="text"
                  value={passCode}
                  onChange={(e) => setPassCode(e.target.value)}
                  placeholder="Нэвтрэх кодоо оруулна уу"
                  className="w-full rounded-lg border border-[#dfe0ea] px-3.5 py-2.5 text-sm outline-none focus-visible:border-[#7c83fd] focus-visible:ring-2 focus-visible:ring-[#7c83fd]/40"
                />
              </div>
            )}

            <label className="flex items-start gap-3 text-sm text-[#1a1a2e]">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 size-4 accent-[#7c83fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
              />
              Зөвшөөрлийн хуудастай танилцсан болно.
            </label>

            {startError && <p className="text-sm text-red-600">{startError}</p>}

            <button
              type="button"
              disabled={!canContinue}
              onClick={handleContinue}
              className="rounded-lg bg-[#7c83fd] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#6870f0] disabled:cursor-not-allowed disabled:bg-[#c7c9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c83fd]"
            >
              {starting ? "Ачаалж байна…" : "Цааш"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <p className="max-w-120 text-center leading-relaxed text-[#5b5b6b]">{children}</p>
    </main>
  );
}
