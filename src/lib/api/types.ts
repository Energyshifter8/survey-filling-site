// Survey модулийн төрлүүд.
//
// Зам/HTTP method баталгаатай (Swagger docs-оор шалгагдсан — PROMPT.md-ийг үз).
// Доорх талбарын нэрс ("// TODO: confirm" тэмдэглэсэн бүгд) ХАРИН баталгаагүй.
// Эдгээрийг төслийн git түүхэнд байсан яг энэ backend-тэй ажиллаж байсан өмнөх
// хувилбараас (git log-оор олдсон, "a216299 start from scratch" коммитоос өмнө)
// зээлж авсан — тиймээс санамсаргүй таамаг биш, харин хамгийн боломжит эх
// сурвалж. Гэвч энэ session дотор бодит staging хариугаар ДАХИН ШАЛГААГҮЙ тул
// TODO хэвээр байна.

export interface BrowserInfo {
  deviceId: string;
  browser: string;
  passCode?: string;
}

export interface SurveyPublicDto {
  // TODO: confirm — талбарын нэрс бүгд.
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
  // TODO: confirm — /participate хариу яг ийм бүтэцтэй эсэх.
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveyToken {
  // TODO: confirm — талбарын нэрс.
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
  // TODO: confirm — "content" vs "label" vs "text" гэх мэт талбарын нэр.
  id: number;
  content: string;
}

export interface QuestionWithRule {
  // TODO: confirm — талбарын нэрс бүгд.
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
  questionId: number;
  optionId?: number;
  questionType: QuestionType;
  duration: number;
}

export interface SurveyResponseSubmission {
  // TODO: confirm — submit-ийн бодит body бүтэц (хамгийн баталгаагүй хэсэг).
  templateQuestionAnswers: AnswerChoice[];
  customQuestionAnswers?: AnswerChoice[];
}
