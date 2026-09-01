"use client";

import { useEffect, useState } from "react";
import {
  checkPass,
  getSurveyQuestions,
  participateSurvey,
  resolveShortUrl,
  submitSurveyResponse,
} from "@/lib/api/survey";
import type { QuestionWithRule, SurveyResponseSubmission } from "@/lib/api/types";
import { getBrowserInfo } from "@/lib/device-info";
import {
  loadSurveyMeta,
  loadSurveySession,
  type SurveyMeta,
  saveSurveyMeta,
  saveSurveySession,
} from "@/lib/survey-session";

/** Resolves a participation code to survey metadata. Used by the landing and tip pages. */
export function useSurveyMeta(code: string) {
  const [meta, setMeta] = useState<SurveyMeta | null>(() => loadSurveyMeta(code));
  const [loading, setLoading] = useState(!meta);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadSurveyMeta(code)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const surveyId = await resolveShortUrl(code);
        const { survey, taken } = await participateSurvey(surveyId, getBrowserInfo());
        if (cancelled) return;
        const next: SurveyMeta = { surveyId, survey, taken };
        saveSurveyMeta(code, next);
        setMeta(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Судалгааг ачаалахад алдаа гарлаа.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return { meta, loading, error };
}

/**
 * Starts (or resumes, if already started this browser session) a response session for the
 * given survey: exchanges device info - and a passcode, for passcode-protected surveys - for
 * a bearer token used by the questions/submit endpoints.
 */
export async function startSurveySession(code: string, surveyId: string, passCode?: string) {
  const existing = loadSurveySession(code);
  if (existing) return existing;

  const session = await checkPass(surveyId, getBrowserInfo(passCode));
  saveSurveySession(code, session);
  return session;
}

/** Loads real survey questions for an active response session, and exposes a submit function. */
export function useSurveyQuestions(code: string) {
  const [questions, setQuestions] = useState<QuestionWithRule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSurveySession(code);
    if (!session) {
      setError("NO_SESSION");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const dto = await getSurveyQuestions(session.responseSessionId, session.token);
        if (cancelled) return;
        // TODO: dto.questions carry `isConditional`/`show`/`nextQuestionId` branching rules that
        // aren't evaluated yet - every question is shown in order. Revisit once conditional
        // question types (MATRIX, MULTI_CHOICE, etc.) get real input renderers.
        const ordered = [
          ...(dto.customQuestionFirst ?? []),
          ...dto.questions,
          ...(dto.customQuestionLast ?? []),
        ].sort((a, b) => a.questionOrder - b.questionOrder);
        setQuestions(ordered);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Асуултуудыг ачаалахад алдаа гарлаа.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  async function submit(submission: SurveyResponseSubmission) {
    const session = loadSurveySession(code);
    if (!session) throw new Error("NO_SESSION");
    await submitSurveyResponse(session.responseSessionId, session.token, submission);
  }

  return { questions, loading, error, submit };
}
