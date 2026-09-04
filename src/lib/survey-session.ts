import type { SurveyPublicDto } from "@/lib/api/types";

// Session/token хадгалах арга: client-side (sessionStorage), server session БИШ.
//
// Яагаад: backend Bearer JWT олгодог (httpOnly cookie биш) — token-ийг эзэмших,
// Authorization header-т залгах ажил аль хэдийн browser талд байгаа тул серверийн
// session давхарга нэмэх шаардлагагүй, зөвхөн дахин dublicate код болно.
// sessionStorage-ыг сонгосон шалтгаан:
//   - `/s/[shortUrl]` (intro/consent) -> `/s/[shortUrl]/questions` шилжихэд
//     токеноо алдахгүй байх ёстой (in-memory Context ашиглавал full page reload
//     дээр устна, sessionStorage бол route/refresh дунд хадгалагдана).
//   - Гэхдээ tab хаагдмагц (эсвэл шинэ tab дээр) цэвэрлэгдэх ёстой — нэг удаагийн
//     судалгаа бөглөх session бол localStorage шиг тагтай хадгалагдах шаардлагагүй,
//     харин ч дараагийн буруу хэрэглэгчид дамжуулах эрсдэлтэй тул sessionStorage
//     илүү зохимжтой.

export interface SurveyMeta {
  surveyId: string;
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveySession {
  responseSessionId: string;
  token: string;
}

function metaKey(shortUrl: string) {
  return `survey_meta_${shortUrl}`;
}

function sessionKey(shortUrl: string) {
  return `survey_session_${shortUrl}`;
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // private mode/storage disabled — session-г дахин фетчлэх л шийдэл
  }
}

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // хадгалах боломжгүй бол чимээгүй унана — дараагийн navigation дээр дахин фетчилнэ
  }
}

function safeRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // хадгалагдаагүй байсан бол устгах ч зүйл алга
  }
}

export function saveSurveyMeta(shortUrl: string, meta: SurveyMeta) {
  safeSet(metaKey(shortUrl), JSON.stringify(meta));
}

export function loadSurveyMeta(shortUrl: string): SurveyMeta | null {
  const raw = safeGet(metaKey(shortUrl));
  return raw ? (JSON.parse(raw) as SurveyMeta) : null;
}

export function saveSurveySession(shortUrl: string, session: SurveySession) {
  safeSet(sessionKey(shortUrl), JSON.stringify(session));
}

export function loadSurveySession(shortUrl: string): SurveySession | null {
  const raw = safeGet(sessionKey(shortUrl));
  return raw ? (JSON.parse(raw) as SurveySession) : null;
}

/** check-pass-аас гарсан session (responseSessionId/token) устгана — token
 *  хугацаа дуусах (401) эсвэл submit амжилттай болоход дуудна. */
export function clearSurveySession(shortUrl: string) {
  safeRemove(sessionKey(shortUrl));
}

// Асуулт дундаас refresh хийхэд эхнээс эхлэхгүй байхын тулд одоогийн БАТЧийн
// дугаар + сонгосон хариултуудыг тусад нь хадгална (session/token-оос
// тусдаа — эдгээр нь UI-only progress, backend rүү харагдахгүй).
//
// ЗАСВАР (2026-09-04): "current" нь ганц асуултын index байсан — survey.pageSize
// (одоо 10 хүртэл байж болох, src/lib/api/types.ts-ийг үз) асуултыг НЭГ дор
// батчлаж render хийдэг болсонтой холбоотой "currentBatchIndex" (батчийн
// index, асуултын index БИШ) болгож нэрийг өөрчилсөн.
export interface SurveyProgress {
  currentBatchIndex: number;
  answers: Record<number, { optionId?: number }>;
}

function progressKey(shortUrl: string) {
  return `survey_progress_${shortUrl}`;
}

export function saveSurveyProgress(shortUrl: string, progress: SurveyProgress) {
  safeSet(progressKey(shortUrl), JSON.stringify(progress));
}

export function loadSurveyProgress(shortUrl: string): SurveyProgress | null {
  const raw = safeGet(progressKey(shortUrl));
  return raw ? (JSON.parse(raw) as SurveyProgress) : null;
}

export function clearSurveyProgress(shortUrl: string) {
  safeRemove(progressKey(shortUrl));
}
