import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  BrowserEvent,
  CustomQuestionSection,
  RecruitmentDTO,
  RestResponse,
  TestQuestions,
  TestSubmission,
} from "@/lib/api/recruitment-types";
import type { BrowserInfo } from "@/lib/api/types";

// Recruitment (талент үнэлгээ) модулийн endpoint-ууд. Зам, method, body-г
// dev backend-ийн Swagger (src/lib/api/recruitment-types.ts-ийн толгойг үз) +
// survey-staging.mindxplus.com/talent/[token]-ийн бодит bundle (дуудлагын
// дараалал, ямар token-оор аль дуудлагыг хийх)-ээр баталгаажуулсан.
//
// Base URL: NEXT_PUBLIC_RECRUITMENT_API_BASE — survey-ээс өөр backend руу
// (dev: http://192.168.2.15:30110) явуулах боломжтой байлгахын тулд тусдаа.
// Байхгүй бол survey-ийн NEXT_PUBLIC_API_URL руу унана.
const RECRUITMENT_API_BASE = process.env.NEXT_PUBLIC_RECRUITMENT_API_BASE || undefined;

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** RestResponse wrapper-тэй ба wrapper-гүй (шууд DTO/string) хариуг хоёуланг нь
 *  задална — Swagger-ийн дагуу load/info/submit wrapper-тэй, qn/cq шууд DTO
 *  буцаадаг. `success: false` бол HTTP 200 байсан ч алдаа гэж үзэж, backend-ийн
 *  мессежийг (жишээ нь "Урилгын холбоос буруу байна") ApiError.body-д үлдээнэ. */
function unwrap<T>(response: RestResponse<T> | T): T {
  if (response && typeof response === "object" && "success" in response) {
    const wrapped = response as RestResponse<T>;
    if (wrapped.success === false) {
      throw new ApiError(wrapped.message ?? "REQUEST_FAILED", wrapped.status ?? 400, wrapped);
    }
    return wrapped.data as T;
  }
  return response as T;
}

/** 1. GET /public/talents/invitation/{token} — урилгын линкээр invitationId авах. */
export async function loadInvitation(token: string): Promise<string> {
  const response = await apiRequest<RestResponse<string> | string>(
    `/public/talents/invitation/${encodeURIComponent(token)}`,
    { baseUrl: RECRUITMENT_API_BASE },
  );
  const invitationId = unwrap(response);
  if (!invitationId) throw new Error("INVITATION_ID_MISSING");
  return invitationId;
}

/** 2. POST /public/talents/invitation/info/{invitationId} — сонгон
 *  шалгаруулалтын мэдээлэл + Bearer token. Body: { deviceId, browser } —
 *  Swagger-ийн BrowserInfo-д `browser` maxLength 50 тул бүтэн userAgent биш,
 *  богино хөтчийн нэр дамжуулна (@/lib/device-info-ийн getBrowserName). */
export async function getRecruitmentInfo(invitationId: string, browserInfo: BrowserInfo): Promise<RecruitmentDTO> {
  const response = await apiRequest<RestResponse<RecruitmentDTO>>(
    `/public/talents/invitation/info/${encodeURIComponent(invitationId)}`,
    {
      method: "POST",
      baseUrl: RECRUITMENT_API_BASE,
      body: { deviceId: browserInfo.deviceId, browser: browserInfo.browser },
    },
  );
  return unwrap(response);
}

/** GET /public/talents/check-token — RecruitmentDTO.authorization хүчинтэй эсэх.
 *  Тест эхлүүлэх бүрд (мөн refresh хийж буцаж ирэхэд) шалгана — бодит
 *  frontend-тэй адил. */
export async function checkRecruitmentToken(authorization: string): Promise<boolean> {
  const response = await apiRequest<RestResponse<boolean> | boolean>("/public/talents/check-token", {
    baseUrl: RECRUITMENT_API_BASE,
    headers: bearer(authorization),
  });
  return unwrap(response) === true;
}

/** 3. POST /public/talents/invitation/qn/{sessionId} — нэг тестийн асуултууд.
 *  Body: StrDTO { str: testId }. */
export async function getTestQuestions(
  sessionId: string,
  testId: string,
  authorization: string,
): Promise<TestQuestions> {
  const response = await apiRequest<RestResponse<TestQuestions> | TestQuestions>(
    `/public/talents/invitation/qn/${encodeURIComponent(sessionId)}`,
    { method: "POST", baseUrl: RECRUITMENT_API_BASE, headers: bearer(authorization), body: { str: testId } },
  );
  return unwrap(response);
}

/** 4. POST /public/talents/invitation/qn/submit — тестийн хариулт. `authorization`
 *  нь getTestQuestions-ийн хариунд ирсэн token. */
export async function submitTest(authorization: string, submission: TestSubmission): Promise<void> {
  const response = await apiRequest<RestResponse<unknown>>("/public/talents/invitation/qn/submit", {
    method: "POST",
    baseUrl: RECRUITMENT_API_BASE,
    headers: bearer(authorization),
    body: submission,
  });
  unwrap(response);
}

/** 5. GET /public/talents/invitation/cq/{sessionId} — ажил олгогчийн нэмэлт
 *  асуултууд. Swagger дээр Authorization параметргүй ч бодит frontend Bearer
 *  явуулдаг тул бид ч мөн адил явуулна. */
export async function getCustomQuestions(sessionId: string, authorization: string): Promise<CustomQuestionSection> {
  const response = await apiRequest<RestResponse<CustomQuestionSection> | CustomQuestionSection>(
    `/public/talents/invitation/cq/${encodeURIComponent(sessionId)}`,
    { baseUrl: RECRUITMENT_API_BASE, headers: bearer(authorization) },
  );
  return unwrap(response);
}

/** 6. POST /public/talents/invitation/cq/submit — нэмэлт асуултын хариулт.
 *  `authorization` нь getCustomQuestions-ийн хариунд ирсэн token. */
export async function submitCustomQuestionAnswers(authorization: string, submission: TestSubmission): Promise<void> {
  const response = await apiRequest<RestResponse<unknown>>("/public/talents/invitation/cq/submit", {
    method: "POST",
    baseUrl: RECRUITMENT_API_BASE,
    headers: bearer(authorization),
    body: submission,
  });
  unwrap(response);
}

/** POST /public/talents/recruitment-tests/{sessionId}/batch-events — хөтчийн
 *  event-үүд (maxBatchSize 50). `authorization` нь RecruitmentDTO.authorization.
 *  Хариу 204 (body-гүй) ирдэг тул JSON задлахгүй. */
export async function sendBrowserEvents(
  sessionId: string,
  authorization: string,
  events: BrowserEvent[],
  options: { keepalive?: boolean } = {},
): Promise<void> {
  await apiRequest(`/public/talents/recruitment-tests/${encodeURIComponent(sessionId)}/batch-events`, {
    method: "POST",
    baseUrl: RECRUITMENT_API_BASE,
    headers: bearer(authorization),
    body: { events },
    keepalive: options.keepalive,
  });
}
