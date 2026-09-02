"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (loadSurveyMeta(shortUrl)) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const surveyId = await resolveShortUrl(shortUrl);
        const { survey, taken } = await participateSurvey(surveyId, getBrowserInfo());
        if (cancelled) return;
        const next: SurveyMeta = { surveyId, survey, taken };
        saveSurveyMeta(shortUrl, next);
        setMeta(next);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = loadSurveySession(shortUrl);
      if (!session) {
        setError(new Error("NO_SESSION"));
        setLoading(false);
        return;
      }

      try {
        const dto = await getSurveyQuestions(session.responseSessionId, session.token);
        if (cancelled) return;
        const ordered = [
          ...(dto.customQuestionFirst ?? []),
          ...dto.questions,
          ...(dto.customQuestionLast ?? []),
        ].sort((a, b) => a.questionOrder - b.questionOrder);
        setQuestions(ordered);
      } catch (err) {
        if (!cancelled) {
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
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
