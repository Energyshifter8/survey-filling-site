import { apiRequest } from "@/lib/api/client";
import type { SurveyQuestionsDTO, SurveyResponseSubmission, SurveyToken, TakeSurvey } from "@/lib/api/types";

/** 1. GET /s/{shortUrl} — судалгааг холбоосоор ачаалж, surveyId авах.
 *  TODO: confirm — хариу нь raw string (surveyId) байж болзошгүй гэж
 *  survey-client(1).js-д тэмдэглэсэн тул хоёуланг нь дэмжинэ. */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  const data = await apiRequest<unknown>(`/s/${encodeURIComponent(shortUrl)}`);
  const id = typeof data === "string" ? data : (data as { surveyId?: string; id?: string })?.surveyId ?? (data as { id?: string })?.id;
  if (!id) throw new Error("SURVEY_ID_MISSING");
  return id;
}

/** 2. POST /public/survey/{surveyId}/participate — судалгааны мэдээлэл + taken эсэх.
 *  TODO: confirm — body шаардлагагүй гэж өгөгдсөн reference client-ийг дагасан;
 *  хэрэв "taken" төлөвийг device-ээр ялгах шаардлагатай бол backend нь
 *  deviceId агуулсан body хүлээж авдаг байж болзошгүй (git түүхэн дэх өмнөх
 *  хувилбар ийм байсан). Staging-аар бодитоор шалгах хэрэгтэй. */
export function participateSurvey(surveyId: string): Promise<TakeSurvey> {
  return apiRequest<TakeSurvey>(`/public/survey/${encodeURIComponent(surveyId)}/participate`, {
    method: "POST",
  });
}

/** 3. POST /public/survey/{surveyId}/check-pass — session + Bearer token авах.
 *  passCode нь зөвхөн passcode-protected судалгаанд, өгөгдсөн үед л body-д орно
 *  (reference client body-гүй тул — passCode заавал биш үед хэвээр body-гүй дуудна). */
export function checkPass(surveyId: string, passCode?: string): Promise<SurveyToken> {
  return apiRequest<SurveyToken>(`/public/survey/${encodeURIComponent(surveyId)}/check-pass`, {
    method: "POST",
    ...(passCode ? { body: { passCode } } : {}),
  });
}

/** 4. GET /public/survey/{responseSessionId}/questions — Bearer шаардсан. */
export function getSurveyQuestions(responseSessionId: string, token: string): Promise<SurveyQuestionsDTO> {
  return apiRequest<SurveyQuestionsDTO>(
    `/public/survey/${encodeURIComponent(responseSessionId)}/questions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/** 5. POST /public/survey/{responseSessionId}/submit — Bearer шаардсан.
 *  TODO: confirm — body-ийн бүтэц (survey-client(1).js-д "TODO: confirm" гэж
 *  тэмдэглэгдсэн хамгийн баталгаагүй хэсэг). */
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
