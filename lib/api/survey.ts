import { apiRequest } from "@/lib/api/client";
import type {
  BrowserInfo,
  CustomerFeedback,
  EmailResponse,
  RestResponseVoid,
  SurveyQuestionsDTO,
  SurveyResponseSubmission,
  SurveyToken,
  TakeSurvey,
} from "@/lib/api/types";

/** 1. Resolve a participation short link (e.g. "demo123") to a survey id. */
export function resolveShortUrl(shorturl: string) {
  return apiRequest<string>(`/s/${encodeURIComponent(shorturl)}`);
}

/** 2. Fetch survey metadata (pages, timing, design) by survey id. */
export function participateSurvey(surveyId: string, browserInfo: BrowserInfo) {
  return apiRequest<TakeSurvey>(`/public/survey/${encodeURIComponent(surveyId)}/participate`, {
    method: "POST",
    body: browserInfo,
  });
}

/** 3. Exchange device info (+ passcode, if the survey requires one) for a response session + bearer token. */
export function checkPass(surveyId: string, browserInfo: BrowserInfo) {
  return apiRequest<SurveyToken>(`/public/survey/${encodeURIComponent(surveyId)}/check-pass`, {
    method: "POST",
    body: browserInfo,
  });
}

/** 4. Fetch the questions for an in-progress response session. */
export function getSurveyQuestions(responseSessionId: string, token: string) {
  return apiRequest<SurveyQuestionsDTO>(
    `/public/survey/${encodeURIComponent(responseSessionId)}/questions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/** 5. Submit answers for a response session. */
export function submitSurveyResponse(
  responseSessionId: string,
  token: string,
  submission: SurveyResponseSubmission,
) {
  return apiRequest<string>(`/public/survey/${encodeURIComponent(responseSessionId)}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: submission,
  });
}

/** Email a copy of the survey results to the participant. */
export function emailSurveyResults(payload: EmailResponse) {
  return apiRequest<string>("/public/survey/email", { method: "POST", body: payload });
}

/** Post-participation feedback on the survey itself. */
export function sendSurveyFeedback(responseSessionId: string, feedback: CustomerFeedback) {
  return apiRequest<RestResponseVoid>(
    `/public/feedback/survey/${encodeURIComponent(responseSessionId)}`,
    { method: "POST", body: feedback },
  );
}

/** Feedback on an individual assessment report. */
export function sendReportFeedback(reportId: string, feedback: CustomerFeedback) {
  return apiRequest<RestResponseVoid>(`/public/feedback/report/${encodeURIComponent(reportId)}`, {
    method: "POST",
    body: feedback,
  });
}
