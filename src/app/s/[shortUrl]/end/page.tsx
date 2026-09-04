"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { BODY_SIZE_CLASSES, HEADING_SIZE_CLASSES } from "@/components/FontSizeToggle";
import { requestSurveyResultsByEmail } from "@/lib/api/survey";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
import { manrope } from "@/lib/fonts";
import {
  clearSurveySession,
  loadSurveyMeta,
  loadSurveySession,
  type SurveyMeta,
  type SurveySession,
} from "@/lib/survey-session";
import { trackEvent } from "@/lib/telemetry";

// Судалгаа submit амжилттай дуусаад ирэх "end" хуудас — reference
// (survey-staging.mindxplus.com)-ийн /s/{shortUrl}/end route-той ижил.
//
// Баталгаажуулсан зүйлс (2026-09-03, тухайн route-ийн бодит JS bundle-ээс,
// жинхэнэ имэйл ДУУДАЛГҮЙгээр):
// - Гарчиг/тайлбар нь survey.pages.END[0].title/.content-ээс ирнэ (START-тай
//   яг ижил SurveyPageDTO бүтэц) — доор fallback-тайгаар уншиж байна.
// - "Хариу авах" (POST /public/survey/email) зөвхөн survey.hasAssessment
//   true үед л reference дээр харагддаг тул бид ч мөн адил нөхцөлдүүлсэн.
// - Body бүтэц: { responseId, surveyId, email } (талбарын нэр "responseId" —
//   "responseSessionId" биш, гэхдээ утга нь check-pass-аас гарсан
//   responseSessionId-тай адилхан) + Authorization: Bearer <token>.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SurveyEndPage({ params }: { params: Promise<{ shortUrl: string }> }) {
  const { shortUrl } = use(params);
  const router = useRouter();
  // /s/[shortUrl]/layout.tsx-ийн <FontSizeProvider>-ээс — intro/consent/
  // questions хуудастай ижил (localStorage-д хадгалагдсан) фонт хэмжээг
  // хуваалцана.
  const { level: fontLevel } = useFontSize();

  // АНХААР (hydration): sessionStorage-ыг lazy useState initializer дотор
  // шууд уншиж болохгүй — сервер дээр (window байхгүй) initial state
  // үргэлж null гардаг тул client-ийн ЭХНИЙ (hydration) render аль хэдийн
  // кэшлэгдсэн утгатай ирвэл сервер/клиентийн үр дүн зөрж, React "Hydration
  // failed" алдаа шиднэ (2026-09-03: анх ийм байдлаар бичээд бодит staging
  // урсгалаар шалгахад яг энэ алдаа гарсан). Тиймээс null-ээр эхлээд, mount
  // болсны ДАРАА (client-only useEffect) уншина.
  const [meta, setMeta] = useState<SurveyMeta | null>(null);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [ready, setReady] = useState(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setMeta(loadSurveyMeta(shortUrl));
    setSession(loadSurveySession(shortUrl));
    setReady(true);
  }, [shortUrl]);

  // Meta нь intro/consent хуудсанд аль хэдийн кэш хийгдсэн байх ёстой
  // (fresh navigation биш байх учиртай) — байхгүй бол дахин fetch хийхийн
  // оронд зүгээр эхлэл рүү буцаана (бусад route-уудын SESSION_EXPIRED-тэй
  // ижил зарчим). `ready`-г хүлээхгүй бол mount дээрх эхний (meta хараахан
  // уншигдаагүй) null-ыг "байхгүй" гэж андуураад дутуу шалтгаанаар шууд
  // редирект хийчихнэ.
  useEffect(() => {
    if (ready && !meta) router.replace(`/s/${shortUrl}`);
  }, [ready, meta, router, shortUrl]);

  if (!meta) return null;

  const { survey, surveyId } = meta;
  const endPage = survey.pages?.END?.[0];
  const displayTitle = endPage?.title || "Судалгаа амжилттай дууслаа";
  const displayDescription = endPage?.content || "Судалгаанд оролцсонд баярлалаа.";

  // Bearer token байхгүй бол (жишээ нь хэрэглэгч энэ хуудас руу шууд URL-аар
  // орсон бол) email хүсэлт зөв authenticate хийгдэхгүй тул форм харуулахгүй.
  const canRequestByEmail = Boolean(survey.hasAssessment && session);

  function handleSkip() {
    setSkipped(true);
    clearSurveySession(shortUrl);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !session) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Имэйл хаяг шаардлагатай");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Имэйл хаяг буруу байна");
      return;
    }

    setEmailError(null);
    setSendError(null);
    setSending(true);
    try {
      trackEvent("survey_result_email_requested", { shortUrl });
      await requestSurveyResultsByEmail(session.token, {
        responseId: session.responseSessionId,
        surveyId,
        email: trimmed,
      });
      setSent(true);
      // Reference-тэй адил: имэйл амжилттай илгээгдсэний ДАРАА л session-ыг
      // бүрэн цэвэрлэнэ (submit амжилттай болмогц биш — src/lib/use-survey.ts-ийг үз).
      clearSurveySession(shortUrl);
    } catch (err) {
      setSendError(getFriendlyErrorMessage(err, "authenticated"));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={`flex flex-1 flex-col items-center bg-[#F5F7FF] px-4 py-16 md:px-7.5 ${manrope.className}`}>
      <div className="flex w-full max-w-125 flex-col items-center gap-5 text-center">
        <h1 className={`font-semibold leading-tight text-[#10182B] ${HEADING_SIZE_CLASSES[fontLevel]}`}>
          {displayTitle}
        </h1>
        <p className={`text-[#10182B] ${BODY_SIZE_CLASSES[fontLevel]}`}>{displayDescription}</p>

        {canRequestByEmail && !sent && !skipped && (
          <form onSubmit={handleEmailSubmit} noValidate className="mt-4 flex w-full flex-col items-center gap-2">
            <label htmlFor="resultEmail" className="w-full text-left text-sm font-medium text-[#10182B]">
              Цахим шуудангаар үр дүнгээ хүлээн авах
            </label>
            <div className="flex w-full gap-2.5">
              <input
                id="resultEmail"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="Цахим шуудан"
                disabled={sending}
                className="h-10 w-full rounded-lg border border-[#CBD5E1] px-3.5 text-sm text-[#10182B] outline-none focus-visible:border-[#8CA9FF] focus-visible:ring-2 focus-visible:ring-[#8CA9FF]/40 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending}
                className="h-10 shrink-0 rounded-lg bg-[#8CA9FF] px-6 text-sm font-medium text-white transition-colors hover:bg-[#7396FF] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
              >
                {sending ? "Илгээж байна…" : "Хариу авах"}
              </button>
            </div>
            {emailError && <p className="w-full text-left text-sm text-red-600">{emailError}</p>}
            {sendError && <p className="w-full text-left text-sm text-red-600">{sendError}</p>}

            <p className="mt-1 text-xs text-[#637389]">
              Энэ имэйл хаяг зөвхөн таны хариултын үр дүнг илгээхэд ашиглагдана — хаа нэгтээй нийтэд харагдахгүй, тусад
              нь хадгалагдахгүй.
            </p>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-[#637389] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              Алгасах (заавал биш)
            </button>
          </form>
        )}

        {canRequestByEmail && sent && (
          <p className="mt-4 text-sm font-medium text-[#10182B]">Илгээгдлээ. Таны имэйл хаягаар удахгүй үр дүн очно.</p>
        )}
      </div>
    </main>
  );
}
