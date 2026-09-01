import type { SurveyPublicDto } from "@/lib/api/types";

export interface SurveyMeta {
  surveyId: string;
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveySession {
  responseSessionId: string;
  token: string;
}

// Survey metadata and the check-pass session are stored per participation code so the
// landing, tip and questions pages (three separate Next.js routes) can share them without
// refetching or re-issuing a response session on every navigation.

function metaKey(code: string) {
  return `mindx_survey_meta_${code}`;
}

function sessionKey(code: string) {
  return `mindx_survey_session_${code}`;
}

export function saveSurveyMeta(code: string, meta: SurveyMeta) {
  sessionStorage.setItem(metaKey(code), JSON.stringify(meta));
}

export function loadSurveyMeta(code: string): SurveyMeta | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(metaKey(code));
  return raw ? (JSON.parse(raw) as SurveyMeta) : null;
}

export function saveSurveySession(code: string, session: SurveySession) {
  sessionStorage.setItem(sessionKey(code), JSON.stringify(session));
}

export function loadSurveySession(code: string): SurveySession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(sessionKey(code));
  return raw ? (JSON.parse(raw) as SurveySession) : null;
}
