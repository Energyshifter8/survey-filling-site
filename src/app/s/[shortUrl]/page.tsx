"use client";

import { Manrope } from "next/font/google";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import ConsentModal from "@/components/ConsentModal";
import FontSizeToggle, {
  BODY_SIZE_CLASSES,
  HEADING_SIZE_CLASSES,
  META_SIZE_CLASSES,
  type FontSizeLevel,
} from "@/components/FontSizeToggle";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { trackEvent } from "@/lib/telemetry";
import { startSurveySession, useSurveyMeta } from "@/lib/use-survey";

// Typography/өнгө/spacing — survey-staging.mindxplus.com (бодит reference)-тэй
// тулгаж тохируулсан (2026-09): font Manrope, bg #F5F7FF, үндсэн текст #10182B,
// хоёрдогч текст #637389, accent товч #8CA9FF (тухайн үеийн даалгаварт дурдсан
// #7C83FD биш — бодит хэрэглэгддэг өнгө нь #8CA9FF гэдгийг DevTools-оор
// баталгаажуулсан). Ганц зориудаар ялгасан зүйл: disabled товчинд бид
// opacity-60 нэмсэн — reference disabled/enabled хооронд ЯМАР Ч визуал ялгаагүй
// (зөвхөн cursor:not-allowed), гэхдээ энэ нь хэрэглэгчид "чекбокс дараагүй тул
// товч идэвхгүй байна" гэдгийг харуулахгүй тул a11y-ийн үүднээс илүү сайн гэж
// үзсэн.
const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"] });

type Step = "intro" | "consent";

export default function SurveyLandingPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  const { meta, loading, error } = useSurveyMeta(shortUrl);

  const [step, setStep] = useState<Step>("intro");
  const [consented, setConsented] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [passCode, setPassCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [fontLevel, setFontLevel] = useState<FontSizeLevel>(0);

  if (loading) {
    return <StatusScreen manrope={manrope.className}>Судалгааг ачааллаж байна…</StatusScreen>;
  }

  if (error) {
    // resolveShortUrl / participateSurvey — Bearer token хараахан байхгүй үе.
    return <StatusScreen manrope={manrope.className}>{getFriendlyErrorMessage(error, "public")}</StatusScreen>;
  }

  if (!meta) return null;

  const { survey, taken } = meta;

  if (taken) {
    return (
      <StatusScreen manrope={manrope.className}>
        {survey.title ? `${survey.title} — ` : ""}
        Та энэ судалгааг өмнө нь бөглөсөн байна. Баярлалаа!
      </StatusScreen>
    );
  }

  if (survey.expired || survey.canParticipate === false) {
    return (
      <StatusScreen manrope={manrope.className}>
        {survey.message ?? "Энэ судалгаа одоогоор оролцох боломжгүй байна."}
      </StatusScreen>
    );
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
    <main className={`flex flex-1 flex-col items-center bg-[#F5F7FF] px-4 py-3 md:px-7.5 md:py-5 ${manrope.className}`}>
      <div className="flex w-full justify-end">
        <FontSizeToggle level={fontLevel} onChange={setFontLevel} />
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-200">
          {step === "intro" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <h1 className={`font-semibold leading-tight text-[#10182B] ${HEADING_SIZE_CLASSES[fontLevel]}`}>
                {survey.title ?? "Судалгаанд оролцох"}
              </h1>
              {survey.description && (
                <p className={`text-[#10182B] ${BODY_SIZE_CLASSES[fontLevel]}`}>{survey.description}</p>
              )}
              {survey.creator && (
                <p className={META_SIZE_CLASSES[fontLevel]}>
                  <span className="text-[#10182B]">Судалгаа нийтлэгч: </span>
                  <span className="font-medium italic text-[#10182B]">{survey.creator}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep("consent")}
                className="rounded-lg bg-[#8CA9FF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#7396FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
              >
                Эхлэх
              </button>
            </div>
          )}

          {step === "consent" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <h1 className={`font-semibold leading-tight text-[#10182B] ${HEADING_SIZE_CLASSES[fontLevel]}`}>
                {survey.title}
              </h1>
              <p className={`text-[#10182B] ${META_SIZE_CLASSES[fontLevel]}`}>
                {survey.questionCount != null && `${survey.questionCount} асуулт`}
                {survey.questionCount != null && (survey.minMinutes || survey.maxMinutes) && " | "}
                {(survey.minMinutes || survey.maxMinutes) &&
                  `${survey.minMinutes ?? "?"}-${survey.maxMinutes ?? "?"} минут`}
              </p>

              {needsPassCode && (
                <div className="w-full max-w-xs space-y-2 text-left">
                  <label htmlFor="passCode" className="text-sm font-medium text-[#10182B]">
                    Нэвтрэх код
                  </label>
                  <input
                    id="passCode"
                    type="text"
                    value={passCode}
                    onChange={(e) => setPassCode(e.target.value)}
                    placeholder="Нэвтрэх кодоо оруулна уу"
                    className="w-full rounded-lg border border-[#CBD5E1] px-3.5 py-2.5 text-sm text-[#10182B] outline-none focus-visible:border-[#8CA9FF] focus-visible:ring-2 focus-visible:ring-[#8CA9FF]/40"
                  />
                </div>
              )}

              {/* Reference-ийн checkbox-той адил: readOnly, мөрийг дарахад
                  Зөвшөөрлийн modal нээгдэнэ (Цааш товч дарахад биш). */}
              <button
                type="button"
                onClick={() => !consented && setShowConsentModal(true)}
                className="flex w-fit items-center gap-3 text-left"
              >
                <span className="relative flex size-4.5 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={consented}
                    readOnly
                    tabIndex={-1}
                    className="peer size-4.5 appearance-none rounded bg-[#D9D9D9] checked:bg-[#2C2C2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
                  />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute inset-0 size-4 m-auto stroke-white opacity-0 peer-checked:opacity-100"
                    fill="none"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className={META_SIZE_CLASSES[fontLevel] + " text-[#10182B]"}>
                  Зөвшөөрлийн хуудастай танилцсан болно.
                </span>
              </button>

              {startError && <p className="text-sm text-red-600">{startError}</p>}

              <button
                type="button"
                disabled={!canContinue}
                onClick={handleContinue}
                className="rounded-lg bg-[#8CA9FF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#7396FF] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#8CA9FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
              >
                {starting ? "Ачаалж байна…" : "Цааш"}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConsentModal
        open={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onAccept={() => {
          setConsented(true);
          setShowConsentModal(false);
        }}
      />
    </main>
  );
}

function StatusScreen({ children, manrope }: { children: React.ReactNode; manrope: string }) {
  return (
    <main className={`flex flex-1 flex-col items-center justify-center bg-[#F5F7FF] px-4 py-16 ${manrope}`}>
      <p className="max-w-120 text-center leading-relaxed text-[#637389]">{children}</p>
    </main>
  );
}
