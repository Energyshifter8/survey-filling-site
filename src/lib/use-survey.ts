"use client";

import { useEffect, useState } from "react";
import { checkPass, getSurveyQuestions, participateSurvey, resolveShortUrl, submitSurveyResponse } from "@/lib/api/survey";
import type { AnswerChoice, QuestionWithRule, SurveyResponseSubmission } from "@/lib/api/types";
import {
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
        const { survey, taken } = await participateSurvey(surveyId);
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

  const session = await checkPass(surveyId, passCode);
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
        if (!cancelled) setError(err);
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

    const submission: SurveyResponseSubmission = { templateQuestionAnswers, customQuestionAnswers };
    await submitSurveyResponse(session.responseSessionId, session.token, submission);
  }

  return { questions, loading, error, submit };
}
