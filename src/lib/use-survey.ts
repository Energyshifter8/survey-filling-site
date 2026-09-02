"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { checkPass, getSurveyQuestions, participateSurvey, resolveShortUrl, submitSurveyResponse } from "@/lib/api/survey";
import type { AnswerChoice, QuestionWithRule, SurveyResponseSubmission } from "@/lib/api/types";
import { getBrowserInfo } from "@/lib/device-info";
import {
  clearSurveyProgress,
  clearSurveySession,
  loadSurveyMeta,
  loadSurveySession,
  saveSurveyMeta,
  saveSurveySession,
  type SurveyMeta,
} from "@/lib/survey-session";

/** shortUrl-ийг судалгааны мэдээлэл рүү задлана. Intro/consent хуудсанд ашиглана. */
export function useSurveyMeta(shortUrl: string) {
  const [meta, setMeta] = useState<SurveyMeta | null>(() => loadSurveyMeta(shortUrl));
  const [loading, setLoading] = useState(!meta);
  const [error, setError] = useState<unknown>(null);

  // StrictMode (dev, App Router-д анхдагч асаалттай) mount effect бүрийг
  // 2 удаа дуудна (mount → cleanup → дахин mount, бүгд нэг синхрон tick дотор).
  // `fetchedForRef`-ээр аль шортУрл-аар аль хэдийн бодит сүлжээний дуудлага
  // эхлүүлснээ хадгалж, StrictMode-ийн 2 дахь дуудлага дээр дахин эхлүүлэхгүй
  // байхаар хамгаална — cleanup-ээр "cancelled" болгодог хуучин арга биш, учир
  // нь энэ ref нь тухайн mount/unmount мөчлөгөөр дахин тохируулагддаггүй тул
  // ганц (эхний) бодит дуудлагынхаа үр дүнг найдвартай ашиглаж чадна.
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadSurveyMeta(shortUrl)) return;
    if (fetchedForRef.current === shortUrl) return;
    fetchedForRef.current = shortUrl;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const surveyId = await resolveShortUrl(shortUrl);
        const { survey, taken } = await participateSurvey(surveyId, getBrowserInfo());
        if (fetchedForRef.current !== shortUrl) return; // өөр shortUrl-аар дараа нь дахин эхэлсэн бол хуучрал
        const next: SurveyMeta = { surveyId, survey, taken };
        saveSurveyMeta(shortUrl, next);
        setMeta(next);
      } catch (err) {
        if (fetchedForRef.current === shortUrl) setError(err);
      } finally {
        if (fetchedForRef.current === shortUrl) setLoading(false);
      }
    })();
  }, [shortUrl]);

  return { meta, loading, error };
}

/** Consent хуудасны "Цааш" товч дарахад дуудна: session байгаа бол дахин ашиглана
 *  (буцаж ирэх/refresh кэйс), үгүй бол check-pass дуудаж шинээр авна. */
export async function startSurveySession(shortUrl: string, surveyId: string, passCode?: string) {
  const existing = loadSurveySession(shortUrl);
  if (existing) return existing;

  const session = await checkPass(surveyId, getBrowserInfo(passCode));
  saveSurveySession(shortUrl, session);
  return session;
}

/** Questions хуудсанд ашиглана: асуултууд татаж, submit функц гаргаж өгнө. */
export function useSurveyQuestions(shortUrl: string) {
  const [questions, setQuestions] = useState<QuestionWithRule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // useSurveyMeta-тай адил шалтгаанаар (StrictMode давхар mount) — `fetchedForRef`
  // ижил shortUrl-аар GET /questions-ыг дахин эхлүүлэхээс сэргийлнэ. Үүнгүйгээр
  // ижил Bearer token-оор 2 бодит сүлжээний дуудлага явдаг байсан (нэг session-д
  // "questions" 2 удаа дуудагдах" гэж ажиглагдсан шалтгаан — 2026-09).
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (fetchedForRef.current === shortUrl) return;
    fetchedForRef.current = shortUrl;

    (async () => {
      const session = loadSurveySession(shortUrl);
      if (!session) {
        setError(new Error("NO_SESSION"));
        setLoading(false);
        return;
      }

      try {
        const dto = await getSurveyQuestions(session.responseSessionId, session.token);
        if (fetchedForRef.current !== shortUrl) return;
        // ЗАСВАР (2026-09-02, бодит response-оор илэрсэн): section бүрийг ТУСДАА
        // эрэмбэлээд дараа нь холбоно — эсрэгээр бол (бүгдийг нэгтгээд нэг
        // sort хийвэл) CUSTOM_QUESTION_FIRST ба PRIMARY_QUESTION хоёр section
        // ХАРИЛЦАН questionOrder-оороо (хоёулаа 1-ээс эхэлдэг тул) холилцоод,
        // section-ийн дараалал алдагддаг байсан (жишээ нь star/numeric rating
        // асуулт зөв 6/7-р байрандаа биш, 11/13-р байранд, PRIMARY_QUESTION
        // асуултуудтай хутгалдсан байдлаар гарч байсан).
        const sortByOrder = (qs: QuestionWithRule[] | undefined) =>
          [...(qs ?? [])].sort((a, b) => a.questionOrder - b.questionOrder);
        const ordered = [
          ...sortByOrder(dto.customQuestionFirst),
          ...sortByOrder(dto.questions),
          ...sortByOrder(dto.customQuestionLast),
        ];
        setQuestions(ordered);
      } catch (err) {
        if (fetchedForRef.current === shortUrl) {
          if (err instanceof ApiError && err.status === 401) {
            // Token хугацаа дууссан — хуучирсан session/progress-ийг цэвэрлээд
            // эхнээс (intro) эхлүүлнэ (page component "SESSION_EXPIRED"-г барьж redirect хийнэ).
            clearSurveySession(shortUrl);
            clearSurveyProgress(shortUrl);
            setError(new Error("SESSION_EXPIRED"));
          } else {
            setError(err);
          }
        }
      } finally {
        if (fetchedForRef.current === shortUrl) setLoading(false);
      }
    })();
  }, [shortUrl]);

  async function submit(answers: Record<number, { optionId?: number; questionType: QuestionWithRule["questionType"]; section?: QuestionWithRule["section"]; startedAt: number }>) {
    const session = loadSurveySession(shortUrl);
    if (!session) throw new Error("NO_SESSION");

    const templateQuestionAnswers: AnswerChoice[] = [];
    const customQuestionAnswers: AnswerChoice[] = [];
    for (const [questionId, answer] of Object.entries(answers)) {
      const choice: AnswerChoice = {
        questionId: Number(questionId),
        optionId: answer.optionId,
        questionType: answer.questionType,
        duration: Math.round((Date.now() - answer.startedAt) / 1000),
      };
      if (answer.section === "PRIMARY_QUESTION" || !answer.section) {
        templateQuestionAnswers.push(choice);
      } else {
        customQuestionAnswers.push(choice);
      }
    }

    const meta = loadSurveyMeta(shortUrl);
    const submission: SurveyResponseSubmission = {
      templateQuestionAnswers,
      customQuestionAnswers,
      sessionId: session.responseSessionId,
      surveyId: meta?.surveyId ?? "",
    };
    await submitSurveyResponse(session.responseSessionId, session.token, submission);
    // Амжилттай илгээгдмэгц үргэлжлүүлэх зүйл алга — session/progress-ийг цэвэрлэнэ.
    clearSurveySession(shortUrl);
    clearSurveyProgress(shortUrl);
  }

  return { questions, loading, error, submit };
}
