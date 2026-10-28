"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import ConsentModal from "@/components/ConsentModal";
import { BODY_SIZE_CLASSES, META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import { TalentFullscreenOverlays, useTalentFullscreen } from "@/components/TalentFullscreen";
import { TalentCard, TalentCompletedScreen, TalentPrimaryButton, TalentStatusScreen } from "@/components/TalentScreens";
import type { RecruitmentDTO } from "@/lib/api/recruitment-types";
import { TALENT_CONSENT_BASE_CLAUSES, TALENT_CONSENT_DETAIL_SECTIONS } from "@/lib/consent-content";
import { getTalentErrorMessage, isRetryableTalentError } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
import { manrope } from "@/lib/fonts";
import { TALENT_TEXT } from "@/lib/helptext";
import { saveTalentState } from "@/lib/recruitment-session";
import { resolveSurveyTheme, surveyThemeCssVars } from "@/lib/survey-theme";
import { useTalentInvitation } from "@/lib/use-recruitment";

// Талент урилгын нүүр: welcome → талент баталгаажуулах (овог/нэр + зөвшөөрөл)
// → сонгон шалгаруулалтын мэдээллийн хуудсууд (info.pages, байхгүй бол
// алгасна) → бэлэн байдлын шалгах жагсаалт → /test. Дараалал, текст нь бодит
// frontend-ийн (survey-staging.mindxplus.com/talent/[token]) bundle-тэй ижил.
// "Үргэлжлүүлэх" (бэлэн байдал) дарагдсаны дараа үнэлгээ эхэлсэнд тооцогдох тул
// энэ хуудас руу дахин орвол шууд /test руу шилжинэ.

type Step = "welcome" | "verify" | "pages" | "readiness";

// Бодит frontend-тэй адил: зөвхөн кирилл үсэг, зай, зураас.
const CYRILLIC_NAME_RE = /^[Ѐ-ӿ\s-]+$/;
const NON_CYRILLIC_RE = /[^Ѐ-ӿ\s-]/g;

function normalizeName(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/** info.pages[].content нь Quill editor-ийн HTML байж болно (бодит frontend
 *  dangerouslySetInnerHTML-ээр render хийдэг). Ажил олгогчийн оруулсан HTML-ийг
 *  шууд DOM-д оруулахгүйн тулд (XSS) tag-уудыг хуулж, блок бүрийг тусдаа мөр
 *  болгон энгийн текстээр харуулна. DOMParser server дээр байхгүй тул regex. */
function htmlToParagraphs(content: string): string[] {
  const text = content
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function minutesRange(info: Pick<RecruitmentDTO, "minMinutes" | "maxMinutes">): string | null {
  if (!info.minMinutes && !info.maxMinutes) return null;
  return `${info.minMinutes ?? "?"}-${info.maxMinutes ?? "?"}`;
}

export default function TalentLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { state, completed, loading, error } = useTalentInvitation(token);
  const { level: fontLevel } = useFontSize();
  const fullscreen = useTalentFullscreen();

  const [step, setStep] = useState<Step>("welcome");
  const [pageIndex, setPageIndex] = useState(0);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [nameScriptError, setNameScriptError] = useState(false);
  const [consented, setConsented] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [starting, setStarting] = useState(false);

  const alreadyStarted = state?.started === true;
  useEffect(() => {
    if (alreadyStarted) router.replace(`/talent/${token}/test`);
  }, [alreadyStarted, router, token]);

  if (loading) {
    return <TalentStatusScreen>{TALENT_TEXT.loading}</TalentStatusScreen>;
  }

  if (error) {
    // load/info — Bearer хараахан байхгүй үе; backend-ийн мессеж ("Урилгын
    // холбоос буруу байна" гэх мэт) байвал тэрийг нь харуулна. Сүлжээ/системийн
    // алдаанд бодит frontend-тэй адил хуудсыг дахин ачаалах товч гаргана.
    return (
      <TalentStatusScreen>
        <p>{getTalentErrorMessage(error)}</p>
        {isRetryableTalentError(error) && (
          <TalentPrimaryButton className="mt-6" onClick={() => window.location.reload()}>
            {TALENT_TEXT.refreshButton}
          </TalentPrimaryButton>
        )}
      </TalentStatusScreen>
    );
  }

  if (completed) return <TalentCompletedScreen />;

  if (!state || alreadyStarted) return <TalentStatusScreen>{TALENT_TEXT.loading}</TalentStatusScreen>;

  const { info } = state;
  const themeVars = surveyThemeCssVars(resolveSurveyTheme(info.design));
  const pages = [...(info.pages ?? [])].sort((a, b) => a.pageOrder - b.pageOrder);
  const currentPage = pages[pageIndex];
  const invitationFirstName = info.invitation?.firstName;
  const totalMinutes = minutesRange(info);

  function handleNameChange(value: string, setter: (next: string) => void) {
    const filtered = value.replace(NON_CYRILLIC_RE, "");
    setNameScriptError(filtered !== value && value.length > 0);
    setter(filtered);
  }

  function handleVerify() {
    if (!consented) return;
    if (!CYRILLIC_NAME_RE.test(lastName.trim()) || !CYRILLIC_NAME_RE.test(firstName.trim())) {
      toast.error(TALENT_TEXT.nameInvalid);
      return;
    }
    // Урилга үүсгэхэд ажил олгогчийн оруулсан нэртэй тулгана (том/жижиг үсэг
    // ялгахгүй) — урилгын линкийг өөр хүн нээхээс хамгаалах энгийн шалгалт.
    const invitation = info.invitation;
    if (
      invitation &&
      (normalizeName(lastName) !== normalizeName(invitation.lastName) ||
        normalizeName(firstName) !== normalizeName(invitation.firstName))
    ) {
      toast.error(TALENT_TEXT.nameMismatch);
      return;
    }
    if (pages.length > 0) {
      setPageIndex(0);
      setStep("pages");
    } else {
      setStep("readiness");
    }
  }

  // Welcome, мэдээллийн хуудас, бэлэн байдлын товчнууд бодит frontend-тэй адил
  // fullscreen унтраастай бол асаана (товч дарсан gesture дотроос дуудах ёстой).
  function handleWelcomeStart() {
    fullscreen.ensure();
    setStep("verify");
  }

  function handlePageNext() {
    fullscreen.ensure();
    if (pageIndex < pages.length - 1) setPageIndex(pageIndex + 1);
    else setStep("readiness");
  }

  function handleStart() {
    if (!state || starting) return;
    setStarting(true);
    // /test руу client-side шилжихэд fullscreen хэвээр үлдэнэ.
    fullscreen.ensure();
    saveTalentState(token, { ...state, started: true });
    router.push(`/talent/${token}/test`);
  }

  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center bg-[var(--survey-bg)] px-4 py-16 md:px-7.5 ${manrope.className}`}
      style={themeVars}
    >
      {step === "welcome" && (
        <TalentCard className="flex max-w-150 flex-col items-center gap-5 text-center sm:gap-10">
          <div className="flex flex-col gap-3 sm:gap-6">
            <h1 className="text-2xl font-bold text-[#10182B] md:text-3xl">{TALENT_TEXT.welcomeTitle}</h1>
            <p className={`text-[#637389] ${BODY_SIZE_CLASSES[fontLevel]}`}>{TALENT_TEXT.welcomeDescription}</p>
          </div>
          <TalentPrimaryButton onClick={handleWelcomeStart}>{TALENT_TEXT.startButton}</TalentPrimaryButton>
        </TalentCard>
      )}

      {step === "verify" && (
        <TalentCard className="flex max-w-150 flex-col">
          <div className="border-b border-[#E4E8EF] pb-3 sm:pb-5">
            <h1 className="text-base font-semibold text-[#10182B] md:text-xl">{TALENT_TEXT.verifyTitle}</h1>
            <p className="text-sm text-[#637389]">{TALENT_TEXT.verifyDescription}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-[#8CCDFF] bg-[#E0F2FF] p-4 text-[#001D33]">
            <p className="text-sm font-bold">{TALENT_TEXT.verifyNoticeTitle}</p>
            <ul className="mt-2.5 ml-1 list-inside list-disc space-y-1 text-sm">
              {TALENT_TEXT.verifyNotices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
            <NameInput
              id="talentLastName"
              label={TALENT_TEXT.lastNameLabel}
              placeholder={TALENT_TEXT.lastNamePlaceholder}
              value={lastName}
              onChange={(value) => handleNameChange(value, setLastName)}
            />
            <NameInput
              id="talentFirstName"
              label={TALENT_TEXT.firstNameLabel}
              placeholder={TALENT_TEXT.firstNamePlaceholder}
              value={firstName}
              onChange={(value) => handleNameChange(value, setFirstName)}
            />
          </div>
          {nameScriptError && <p className="mt-1 text-xs text-red-600">{TALENT_TEXT.nameCyrillicHint}</p>}

          {/* Survey-ийн consent мөртэй адил: checkbox нь readOnly, мөрийг дарахад
              зөвшөөрлийн modal нээгдэж, тэнд "Зөвшөөрөх" дарвал л тэмдэглэгдэнэ. */}
          <button
            type="button"
            onClick={() => !consented && setShowConsentModal(true)}
            className="mt-3 flex items-start gap-3 text-left sm:mt-5"
          >
            <input
              type="checkbox"
              checked={consented}
              readOnly
              tabIndex={-1}
              className="mt-0.5 size-4 shrink-0 accent-[#2C2C2C]"
            />
            <span
              className={`font-medium text-[#10182B] underline decoration-[#10182B]/40 underline-offset-2 ${META_SIZE_CLASSES[fontLevel]}`}
            >
              {TALENT_TEXT.consentCheckboxLabel}
            </span>
          </button>

          <div className="mt-5 flex justify-end">
            <TalentPrimaryButton disabled={!consented} onClick={handleVerify}>
              {TALENT_TEXT.continueButton}
            </TalentPrimaryButton>
          </div>
        </TalentCard>
      )}

      {step === "pages" && (
        <TalentCard className="flex max-w-176 flex-col gap-3 sm:gap-6">
          {currentPage?.title && (
            <h1 className="text-center text-xl font-bold text-[#10182B] md:text-3xl">{currentPage.title}</h1>
          )}
          {currentPage?.content && (
            <div className={`space-y-3 text-[#637389] ${BODY_SIZE_CLASSES[fontLevel]}`}>
              {htmlToParagraphs(currentPage.content).map((paragraph, i) => (
                // Догол мөрүүд давхцаж болох тул index-ийг key-д нэмэв.
                // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered list derived from one string.
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2 sm:pt-4">
            <TalentPrimaryButton onClick={handlePageNext}>
              {currentPage?.btnLabel ||
                (pageIndex < pages.length - 1 ? TALENT_TEXT.continueButton : TALENT_TEXT.startButton)}
            </TalentPrimaryButton>
          </div>
        </TalentCard>
      )}

      {step === "readiness" && (
        <TalentCard className="flex max-w-233 flex-col gap-5 sm:gap-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-snug text-[#10182B] sm:text-2xl">
              {TALENT_TEXT.greetingPrefix} {invitationFirstName || firstName}?
            </h1>
            <p className={`mt-4 font-medium text-[#637389] ${BODY_SIZE_CLASSES[fontLevel]}`}>
              {TALENT_TEXT.readinessIntro}
              {totalMinutes && (
                <>
                  {" "}
                  <b className="text-[#10182B]">
                    [{totalMinutes}] {TALENT_TEXT.minutesSuffix}
                  </b>{" "}
                  {TALENT_TEXT.readinessDurationSuffix}
                </>
              )}{" "}
              {TALENT_TEXT.readinessOnce}
            </p>
            <div className="mt-3 rounded-2xl border border-[#FFD95C] bg-[#FFF9E6] p-4">
              <p className="flex items-center gap-1 text-lg font-semibold text-[#8A6100]">
                <span aria-hidden="true">⚠</span>
                {TALENT_TEXT.readinessWarningTitle}
              </p>
              <ul
                className={`mt-2 list-inside list-disc space-y-1 font-medium text-[#637389] ${BODY_SIZE_CLASSES[fontLevel]}`}
              >
                {TALENT_TEXT.readinessChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:mt-10 sm:grid-cols-3">
              <StatCard value={info.testCount ?? info.tests?.length ?? "–"} label={TALENT_TEXT.statTests} />
              <StatCard value={info.customQuestionCount ?? 0} label={TALENT_TEXT.statCustomQuestions} />
              <StatCard
                value={totalMinutes ? `${totalMinutes} ${TALENT_TEXT.minutesSuffix}` : "–"}
                label={TALENT_TEXT.statTotalTime}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <TalentPrimaryButton disabled={starting} onClick={handleStart}>
              {starting ? TALENT_TEXT.loadingButton : TALENT_TEXT.continueButton}
            </TalentPrimaryButton>
          </div>
        </TalentCard>
      )}

      <ConsentModal
        open={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onAccept={() => {
          setConsented(true);
          setShowConsentModal(false);
        }}
        clauses={TALENT_CONSENT_BASE_CLAUSES}
        sections={TALENT_CONSENT_DETAIL_SECTIONS}
      />
      <TalentFullscreenOverlays />
    </main>
  );
}

function NameInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-[#10182B] sm:mb-2">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-[#E4E8EF] px-4 text-[#10182B] outline-none focus-visible:border-[#8CA9FF] focus-visible:ring-2 focus-visible:ring-[#8CA9FF]/40 sm:h-13"
      />
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#E4E8EF] px-4 py-3 sm:py-6">
      <span className="text-2xl font-semibold text-[#10182B]">{value}</span>
      <span className="text-base text-[#637389]">{label}</span>
    </div>
  );
}
