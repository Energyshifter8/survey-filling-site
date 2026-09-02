// Survey модулийн төрлүүд.
//
// Зам/HTTP method баталгаатай (Swagger docs-оор шалгагдсан — PROMPT.md-ийг үз).
// Хүсэлтийн (request) body бүтэц — BrowserInfo, SurveyResponseSubmission-ийн
// гадна давхарга (templateQuestionAnswers/customQuestionAnswers/sessionId/
// surveyId) — decompiled bundle-ээр баталгаажсан (2026-09, survey-staging.mindxplus.com-ийн
// жинхэнэ frontend-ийн client bundle-ээс шууд уншсан).
//
// Хариу (response) доторх дотоод талбарын нэрс ("// TODO: confirm" тэмдэглэсэн
// бүгд) ХАРИН баталгаагүй хэвээр — decompiled bundle зөвхөн request-ийн
// зам/body-г харуулсан, серверийн бодит JSON response-ийг харуулаагүй.

export interface BrowserInfo {
  deviceId: string;
  browser: string;
  passCode?: string;
}

export interface SurveyPublicDto {
  // TODO: confirm — талбарын нэрс бүгд (response, decompiled bundle-ээр харагдаагүй).
  id?: string;
  title?: string;
  description?: string;
  creator?: string;
  passCodeProtected?: boolean;
  canParticipate?: boolean;
  expired?: boolean;
  message?: string;
  questionCount?: number;
  minMinutes?: number;
  maxMinutes?: number;
}

export interface TakeSurvey {
  // TODO: confirm — /participate хариу яг ийм бүтэцтэй эсэх (response, харагдаагүй).
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveyToken {
  // TODO: confirm — талбарын нэрс (response, харагдаагүй).
  responseSessionId: string;
  token: string;
}

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DROPDOWN"
  | "STAR_RATING"
  | "NUMBER_RATING"
  | "YES_NO"
  | "MATRIX"
  | "NUMBER_INPUT"
  | "TEXT"
  | "TEXT_INPUT"
  | "LONG_TEXT";

export type QuestionSection = "CUSTOM_QUESTION_FIRST" | "PRIMARY_QUESTION" | "CUSTOM_QUESTION_LAST";

export interface QuestionOptionDTO {
  // TODO: confirm — "content" vs "label" vs "text" гэх мэт талбарын нэр (response, харагдаагүй).
  id: number;
  content: string;
}

export interface QuestionWithRule {
  // TODO: confirm — талбарын нэрс бүгд (response, харагдаагүй).
  id: number;
  content: string;
  questionType: QuestionType;
  section?: QuestionSection;
  questionOrder: number;
  isRequired?: boolean;
  options?: QuestionOptionDTO[];
}

export interface SurveyQuestionsDTO {
  // TODO: confirm — асуултууд шууд массив байж болзошгүй ("questions" wrapper-гүй).
  customQuestionFirst?: QuestionWithRule[];
  questions: QuestionWithRule[];
  customQuestionLast?: QuestionWithRule[];
}

export interface AnswerChoice {
  // TODO: confirm — дотоод item-ийн талбарын нэрс (questionId/optionId/duration
  // гэх мэт). decompiled bundle зөвхөн гадна SurveyResponseSubmission-ийн
  // бүтцийг харуулсан, item-ийн дотоод nэрсийг харуулаагүй.
  questionId: number;
  optionId?: number;
  questionType: QuestionType;
  duration: number;
}

export interface SurveyResponseSubmission {
  templateQuestionAnswers: AnswerChoice[];
  customQuestionAnswers: AnswerChoice[];
  sessionId: string;
  surveyId: string;
}
