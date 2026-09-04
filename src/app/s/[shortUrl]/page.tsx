"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { use, useState } from "react";
import ConsentModal from "@/components/ConsentModal";
import { BODY_SIZE_CLASSES, HEADING_SIZE_CLASSES, META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
import { manrope } from "@/lib/fonts";
import { resolveSurveyTheme, surveyThemeCssVars } from "@/lib/survey-theme";
import { trackEvent } from "@/lib/telemetry";
import { startSurveySession, useSurveyMeta } from "@/lib/use-survey";

// Typography/spacing — survey-staging.mindxplus.com (бодит reference)-тэй
// тулгаж тохируулсан (2026-09): font Manrope.
//
// ЗАСВАР (2026-09-04): Өнгө (bg/text/товч) урьд нь энд hardcode хийсэн байсан
// (bg #F5F7FF, текст #10182B, accent товч #8CA9FF) — эдгээр нь survey.design.themeType-ээс
// уншиж, @/lib/survey-theme-ийн CSS custom property болгож тараадаг боллоо
// (доорхыг үз). #F5F7FF/#10182B/#8CA9FF нь санамсаргүй давхцал БИШ — яг LIGHT
// theme-ийн утгууд, тиймээс design/themeType алга үед харагдах зүйл өөрчлөгдөхгүй
// (fallback = LIGHT, @/lib/survey-theme-ийг үз). Ганц зориудаар ялгасан зүйл:
// disabled товчинд бид opacity-60 нэмсэн — reference disabled/enabled хооронд
// ЯМАР Ч визуал ялгаагүй (зөвхөн cursor:not-allowed), гэхдээ энэ нь хэрэглэгчид
// "чекбокс дараагүй тул товч идэвхгүй байна" гэдгийг харуулахгүй тул a11y-ийн
// үүднээс илүү сайн гэж үзсэн. (Manrope-ийн тодорхойлолт @/lib/fonts-д
// шилжсэн — ConsentModal Dialog болж Portal-оор document.body руу гарсны
// дараа энэ фонтыг эцэг элементээсээ inherit хийхээ больсон тул хуваалцаж
// ашиглах шаардлагатай болсон. АНХААР: ConsentModal мөн адил Portal-оор
// document.body руу гардаг тул энэ хуудасны <main> дээр тавьсан CSS custom
// property-үүд (--survey-*) DOM-ийн cascade-аар тэнд ХҮРЭХГҮЙ — тиймээс
// ConsentModal-ийн товчны өнгийг доорх theme өөрчлөхгүй, тусад нь themed
// биш хэвээр үлдсэн.)

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
  // Фонт хэмжээ endээс биш, /s/[shortUrl]/layout.tsx-д тавьсан
  // <FontSizeProvider>-ээс ирнэ — бүх дэд page (энэ + questions + end)
  // ижил (localStorage-д хадгалагдсан) хэмжээг хуваалцана.
  const { level: fontLevel } = useFontSize();

  if (loading) {
    return <StatusScreen manrope={manrope.className}>Судалгааг ачааллаж байна…</StatusScreen>;
  }

  if (error) {
    // resolveShortUrl / participateSurvey — Bearer token хараахан байхгүй үе.
    return <StatusScreen manrope={manrope.className}>{getFriendlyErrorMessage(error, "public")}</StatusScreen>;
  }

  if (!meta) return null;

  const { survey, taken, surveyId } = meta;
  // "Ажилтны сайн сайхан байдал" мэтийн гарчиг/тайлбар survey.title/description
  // гэдгээр ирдэггүй (тийм талбар байхгүй) — жинхэнэ эх сурвалж нь
  // survey.pages.START[0] (2026-09-02, curl-ээр баталгаажсан — src/lib/api/types.ts-ийг үз).
  const startPage = survey.pages?.START?.[0];
  const displayTitle = startPage?.title ?? "Судалгаанд оролцох";
  const displayDescription = startPage?.content;
  const themeVars = surveyThemeCssVars(resolveSurveyTheme(survey.design));

  if (taken) {
    return (
      <StatusScreen manrope={manrope.className} style={themeVars}>
        {displayTitle ? `${displayTitle} — ` : ""}
        Та энэ судалгааг өмнө нь бөглөсөн байна. Баярлалаа!
      </StatusScreen>
    );
  }

  if (survey.expired || survey.canParticipate === false) {
    return (
      <StatusScreen manrope={manrope.className} style={themeVars}>
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
      await startSurveySession(shortUrl, surveyId, needsPassCode ? passCode.trim() : undefined);
      router.push(`/s/${shortUrl}/questions`);
    } catch (err) {
      // checkPass — яг Bearer token олгож буй дуудлага, өөрөө Bearer шаарддаггүй.
      setStartError(getFriendlyErrorMessage(err, "public"));
      setStarting(false);
    }
  }

  return (
    <main
      className={`flex flex-1 flex-col items-center bg-[var(--survey-bg)] px-4 py-3 md:px-7.5 md:py-5 ${manrope.className}`}
      style={themeVars}
    >
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-200">
          {step === "intro" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <h1
                className={`font-semibold leading-tight text-[var(--survey-text)] ${HEADING_SIZE_CLASSES[fontLevel]}`}
              >
                {displayTitle}
              </h1>
              {displayDescription && (
                <p className={`text-[var(--survey-text)] ${BODY_SIZE_CLASSES[fontLevel]}`}>{displayDescription}</p>
              )}
              {survey.creator && (
                <p className={META_SIZE_CLASSES[fontLevel]}>
                  <span className="text-[var(--survey-text)]">Судалгаа нийтлэгч: </span>
                  <span className="font-medium italic text-[var(--survey-text)]">{survey.creator}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep("consent")}
                className="rounded-lg bg-[var(--survey-btn-bg)] px-6 py-3 text-base font-medium text-[var(--survey-btn-text)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-btn-bg)]"
              >
                Эхлэх
              </button>
            </div>
          )}

          {step === "consent" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <h1
                className={`font-semibold leading-tight text-[var(--survey-text)] ${HEADING_SIZE_CLASSES[fontLevel]}`}
              >
                {displayTitle}
              </h1>
              <p className={`text-[var(--survey-text)] ${META_SIZE_CLASSES[fontLevel]}`}>
                {survey.questionCount != null && `${survey.questionCount} асуулт`}
                {survey.questionCount != null && (survey.minMinutes || survey.maxMinutes) && " | "}
                {(survey.minMinutes || survey.maxMinutes) &&
                  `${survey.minMinutes ?? "?"}-${survey.maxMinutes ?? "?"} минут`}
              </p>

              {needsPassCode && (
                <div className="w-full max-w-xs space-y-2 text-left">
                  <label htmlFor="passCode" className="text-sm font-medium text-[var(--survey-text)]">
                    Нэвтрэх код
                  </label>
                  <input
                    id="passCode"
                    type="text"
                    value={passCode}
                    onChange={(e) => setPassCode(e.target.value)}
                    placeholder="Нэвтрэх кодоо оруулна уу"
                    className="w-full rounded-lg border border-[var(--survey-option-border)] px-3.5 py-2.5 text-sm text-[var(--survey-text)] outline-none focus-visible:border-[var(--survey-option-border-active)] focus-visible:ring-2 focus-visible:ring-[var(--survey-option-border-active)]/40"
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
                <span className={`${META_SIZE_CLASSES[fontLevel]} text-[#10182B]`}>
                  Зөвшөөрлийн хуудастай танилцсан болно.
                </span>
              </button>

              {startError && <p className="text-sm text-red-600">{startError}</p>}

              <button
                type="button"
                disabled={!canContinue}
                onClick={handleContinue}
                className="rounded-lg bg-[var(--survey-btn-bg)] px-6 py-3 text-base font-medium text-[var(--survey-btn-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-btn-bg)]"
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

function StatusScreen({
  children,
  manrope,
  style,
}: {
  children: React.ReactNode;
  manrope: string;
  // meta ачаалагдахаас өмнө (loading/error) theme мэдэгдэхгүй тул style
  // заавал биш — тэр үед hardcode fallback (LIGHT-тэй ижил утга) ашиглана.
  style?: CSSProperties;
}) {
  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center bg-[var(--survey-bg,#F5F7FF)] px-4 py-16 ${manrope}`}
      style={style}
    >
      <p className="max-w-120 text-center leading-relaxed text-[var(--survey-desc,#637389)]">{children}</p>
    </main>
  );
}
