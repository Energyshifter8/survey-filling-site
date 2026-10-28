// Recruitment (талент үнэлгээ) модулийн төрлүүд.
//
// Эх сурвалж: http://192.168.2.15:30110/v3/api-docs/mindx-collector (dev
// backend-ийн OpenAPI, 2026-10-27-нд уншсан). АНХААР: энэ dev backend болон
// collector-staging.mindxplus.com хоёрын submit body ӨӨР (2026-10-27 curl-ээр
// шалгасан): staging `{ id, answerList: AnswerChoice[], totalTimeTaken }`
// хүлээдэг (survey-staging.mindxplus.com/talent/[token]-ийн бодит bundle ч
// үүнийг илгээдэг), dev backend `{ id, answers: QuestionAnswerRequest[] }`.
// Шилжилтийн үед хоёуланг нь нэг body-д илгээнэ — доорх TestSubmission-ийг үз.
//
// QuestionWithRule, DesignDTO, PageDTO нь survey-тэй ижил schema тул
// @/lib/api/types-аас дахин ашиглана.

import type { AnswerChoice, QuestionWithRule, SurveyDesignDTO, SurveyPageDTO } from "@/lib/api/types";

/** Recruitment endpoint-уудын ихэнх нь HTTP 200 дотор ийм wrapper буцаадаг —
 *  алдаа ч гэсэн (жишээ нь буруу token: `{status: 404, message: "Урилгын
 *  холбоос буруу байна", success: false}`, 2026-10-27 curl-ээр шалгасан).
 *  Тиймээс HTTP status-аас гадна `success`-ийг заавал шалгана. */
export interface RestResponse<T> {
  message?: string;
  data?: T;
  status?: number;
  success?: boolean;
}

/** Swagger: NewInvitation — B2C (ажил олгогч) талаас урилга үүсгэхэд ашигладаг
 *  schema, RecruitmentDTO.invitation-д буцаж ирнэ. */
export interface RecruitmentInvitation {
  id: string;
  recruitmentId: string;
  firstName: string;
  lastName: string;
  email: string;
  dueDate: string;
  token: string;
}

/** Swagger: RecruitmentTestInfo — сонгон шалгаруулалтад багтсан нэг тест. */
export interface RecruitmentTestInfo {
  id: string;
  minMinutes?: number;
  maxMinutes?: number;
  questionCount?: number;
}

/** Swagger: RecruitmentDTO — POST /public/talents/invitation/info/{invitationId}.
 *  `authorization` бол Bearer token (тест авах, event илгээх, check-token-д
 *  ашиглана). Swagger-ийн "required" жагсаалт байхгүй тул бүгд заавал биш. */
export interface RecruitmentDTO {
  sessionId: string;
  authorization: string;
  testCount?: number;
  minMinutes?: number;
  maxMinutes?: number;
  questionCount?: number;
  customQuestionCount?: number;
  hasCustomQuestions?: boolean;
  invitation?: RecruitmentInvitation;
  design?: SurveyDesignDTO;
  tests?: RecruitmentTestInfo[];
  pages?: SurveyPageDTO[];
}

/** Swagger: TestQuestions — POST /public/talents/invitation/qn/{sessionId}.
 *  `id` нь энэ тестийн хариултын id (submit-ийн TestSubmission.id болон
 *  BrowserEvent.testAnswerId). `authorization` — submit-д ашиглах token
 *  (Swagger: "getTestQuestions() endpoint-ын үр дүнд авсан Authorization
 *  token-ээрээ хариултаа илгээнэ"). */
export interface TestQuestions {
  id: string;
  authorization?: string;
  pageSize?: number;
  hash?: string;
  question?: QuestionWithRule[];
}

/** Swagger: CustomQuestionSection — GET /public/talents/invitation/cq/{sessionId}.
 *  Ажил олгогчийн нэмэлт асуултууд; эхэнд (start) болон төгсгөлд (end)
 *  харагдах хоёр бүлэгтэй — бид тестүүдийн дараа нэг дор асууна (бодит
 *  frontend-тэй адил). */
export interface CustomQuestionSection {
  id: string;
  authorization?: string;
  pageSize?: number;
  startQuestions?: QuestionWithRule[];
  endQuestions?: QuestionWithRule[];
  questionCount?: number;
  minMinutes?: number;
  maxMinutes?: number;
}

/** Swagger: QuestionAnswerRequest. "required": ["duration", "questionId"].
 *  `duration` — секунд (int32). `optionIds` — сонголтот асуулт (MULTI_CHOICE-д
 *  олон, бусдад 1). `textAnswer` — чөлөөт бичвэр (maxLength 500).
 *  `visibleMs`/`firstInteractionMs`/`changeCount` — engagement хэмжүүр
 *  (@/lib/question-engagement-ийг үз). */
export interface QuestionAnswerRequest {
  questionId: number;
  optionIds?: number[];
  textAnswer?: string;
  duration: number;
  visibleMs?: number;
  firstInteractionMs?: number;
  changeCount?: number;
}

/** Swagger: TestSubmission — qn/submit болон cq/submit хоёулаа. "required":
 *  ["answers", "id"], `answers` хоосон байж болохгүй (dev backend 400
 *  "Хоосон байж болохгүй" буцаадгийг шалгасан).
 *
 *  `answerList`/`totalTimeTaken` — collector-staging-ийн хуучин гэрээ
 *  (`answerList` хоосон бол 400 "Хоосон байж болохгүй", 2026-10-28 бодит
 *  урилгаар шалгасан). Spring Jackson танихгүй талбарыг үл тоодог тул хоёр
 *  гэрээг зэрэг илгээхэд backend бүр өөрийнхөө талбарыг л уншина. Staging
 *  шинэ гэрээнд шилжмэгц эдгээрийг устгана. */
export interface TestSubmission {
  id: string;
  answers: QuestionAnswerRequest[];
  answerList: AnswerChoice[];
  totalTimeTaken: number;
}

/** Swagger: BrowserEvent.eventType-ийн бүрэн enum. */
export type BrowserEventType =
  | "WINDOW_FOCUS_LOST"
  | "PAGE_VISIBILITY_HIDDEN"
  | "COPY"
  | "CUT"
  | "PASTE"
  | "FULLSCREEN_EXIT";

/** Swagger: BrowserEvent. `metadata` нь Map<String, String> — тоог ч string
 *  болгож илгээнэ. */
export interface BrowserEvent {
  eventType: BrowserEventType;
  testAnswerId?: string;
  questionId?: number;
  metadata?: Record<string, string>;
}
