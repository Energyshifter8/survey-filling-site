import { apiRequest, apiRequestText } from "@/lib/api/client";
import type {
  BrowserInfo,
  SurveyQuestionsDTO,
  SurveyResponseSubmission,
  SurveyToken,
  TakeSurvey,
} from "@/lib/api/types";

/** 1. GET /s/{shortUrl} — судалгааг холбоосоор ачаалж, surveyId авах.
 *  Хариу нь raw plain-text surveyId (JSON биш) — decompiled bundle-ээр
 *  баталгаажсан (2026-09), тиймээс JSON парслахгүй `apiRequestText` ашиглана. */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  const id = (await apiRequestText(`/s/${encodeURIComponent(shortUrl)}`)).trim();
  if (!id) throw new Error("SURVEY_ID_MISSING");
  return id;
}

/** 2. POST /public/survey/{surveyId}/participate — судалгааны мэдээлэл + taken эсэх.
 *  Body: { deviceId, browser, passCode } — decompiled bundle-ээр баталгаажсан (2026-09). */
export function participateSurvey(surveyId: string, browserInfo: BrowserInfo): Promise<TakeSurvey> {
  return apiRequest<TakeSurvey>(`/public/survey/${encodeURIComponent(surveyId)}/participate`, {
    method: "POST",
    body: { deviceId: browserInfo.deviceId, browser: browserInfo.browser, passCode: browserInfo.passCode ?? "" },
  });
}

/** 3. POST /public/survey/{surveyId}/check-pass — session + Bearer token авах.
 *  Body: { deviceId, browser, passCode } — decompiled bundle-ээр баталгаажсан (2026-09). */
export function checkPass(surveyId: string, browserInfo: BrowserInfo): Promise<SurveyToken> {
  return apiRequest<SurveyToken>(`/public/survey/${encodeURIComponent(surveyId)}/check-pass`, {
    method: "POST",
    body: { deviceId: browserInfo.deviceId, browser: browserInfo.browser, passCode: browserInfo.passCode ?? "" },
  });
}

/** 4. GET /public/survey/{responseSessionId}/questions — Bearer шаардсан. */
export function getSurveyQuestions(responseSessionId: string, token: string): Promise<SurveyQuestionsDTO> {
  return apiRequest<SurveyQuestionsDTO>(`/public/survey/${encodeURIComponent(responseSessionId)}/questions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 5. POST /public/survey/{responseSessionId}/submit — Bearer шаардсан.
 *  Body: { templateQuestionAnswers, customQuestionAnswers, sessionId, surveyId } —
 *  гадна бүтэц decompiled bundle-ээр баталгаажсан (2026-09); дотоод item-ийн
 *  талбарын нэрс хэвээр TODO (`src/lib/api/types.ts`-ийн `AnswerChoice`-г үз). */
export function submitSurveyResponse(
  responseSessionId: string,
  token: string,
  submission: SurveyResponseSubmission,
): Promise<unknown> {
  return apiRequest(`/public/survey/${encodeURIComponent(responseSessionId)}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: submission,
  });
}
