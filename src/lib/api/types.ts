// Survey модулийн төрлүүд.
//
// Зам/HTTP method баталгаатай (Swagger docs-оор шалгагдсан — PROMPT.md-ийг үз).
// Хүсэлтийн (request) body бүтэц — BrowserInfo, SurveyResponseSubmission-ийн
// гадна давхарга (templateQuestionAnswers/customQuestionAnswers/sessionId/
// surveyId) — decompiled bundle-ээр баталгаажсан (2026-09, survey-staging.mindxplus.com-ийн
// жинхэнэ frontend-ийн client bundle-ээс шууд уншсан).
//
// Хариу (response) доторх талбарын нэрс — доор "// confirmed 2026-09-02" гэж
// тэмдэглэсэн бүгд бодит staging руу (collector-staging.mindxplus.com) `curl`-ээр
// бодит shortUrl ашиглан 5 endpoint-ыг дараалан дуудаж, жинхэнэ JSON хариунаас
// шалгасан (participate/check-pass/questions). Тэмдэглэлгүй үлдсэн зүйл л
// хараахан баталгаагүй.

export interface BrowserInfo {
  deviceId: string;
  browser: string;
  passCode?: string;
}

// confirmed 2026-09-02: survey.pages.{START,END}[0]-ийн бүтэц — "Ажилтны сайн
// сайхан байдал" мэтийн гарчиг ЭНДЭЭС ирдэг (асуулт дээрх category талбар
// БИШ — QuestionWithRule дээр category гэсэн зүйл огт байхгүй, доорхыг үз).
export type SurveyPageSection = "START" | "END";

export interface SurveyPageDTO {
  id: number;
  qnSection: SurveyPageSection;
  pageType: string;
  title: string;
  content: string;
  btnLabel: string;
  pageOrder: number;
}

export interface SurveyDesignDTO {
  id: number;
  designOwnerId: string;
  designOwnerType: string;
  themeType: string;
  imagePosition: string;
  showAppLogo: boolean;
  hasLogo: boolean;
}

export interface SurveyPublicDto {
  // confirmed 2026-09-02. АНХААР: энд "title"/"description" гэсэн шууд талбар
  // БАЙХГҮЙ (өмнө таамагласан байсан нь буруу) — гарчиг/тайлбар
  // pages.START[0].title / .content-ээс ирдэг.
  id: string;
  passCodeProtected?: boolean;
  canParticipate?: boolean;
  expired?: boolean;
  message?: string | null;
  questionCount?: number;
  minMinutes?: number;
  maxMinutes?: number;
  // 1 "page"-д яг 1 асуулт байдгийг баталгаажуулсан талбар (2026-09-02) —
  // олон асуулт нэг дэлгэц дээр зэрэг харуулах кэйс байхгүй.
  pageSize?: number;
  creator?: string;
  hasAssessment?: boolean;
  design?: SurveyDesignDTO;
  pages?: Partial<Record<SurveyPageSection, SurveyPageDTO[]>>;
  status?: string;
}

export interface TakeSurvey {
  // confirmed 2026-09-02.
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveyToken {
  // confirmed 2026-09-02.
  responseSessionId: string;
  token: string;
}

export type QuestionType =
  // confirmed 2026-09-02 (бодит судалгаанд гарсан): SINGLE_CHOICE, STAR_RATING,
  // NUMBER_RATING. Доорх бусад нь QuestionType enum-ийн урьд таамагласан
  // гишүүд хэвээр — энэ судалгаанд гараагүй тул баталгаагүй хэвээр байна.
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
  // confirmed 2026-09-02. "order" — сонголтын харагдах дараалал (star/numeric
  // rating дээр ЭНЭ дарааллаар од/тоо render хийнэ). "point" — оноо (submit
  // логикт одоогоор ашиглагдахгүй, урд нь бэлдсэн).
  id: number;
  order: number;
  content: string;
  point: number;
}

export interface QuestionWithRule {
  // confirmed 2026-09-02. АНХААР: "isRequired" биш, бодит нэр нь "required".
  // "category" гэсэн талбар огт байхгүй (дээрх SurveyPageDTO-г үз).
  id: number;
  content: string;
  questionType: QuestionType;
  section?: QuestionSection;
  questionOrder: number;
  required?: boolean;
  minAnswerCount?: number;
  maxAnswerCount?: number;
  // Дараагийн асуултын id — бүх асуултаар шугаман chain (conditional: false),
  // сүүлчийн асуулт дээр undefined/null.
  nextQuestionId?: number | null;
  conditional?: boolean;
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

// confirmed 2026-09-03: survey-staging.mindxplus.com-ийн /s/{id}/end route-ийн
// бодит JS bundle-аас (`/public/survey/email` дуудлагыг шууд бичсэн функц)
// уншсан — талбарын нэр "responseSessionId" БИШ, "responseId" (ижил утгатай:
// check-pass-аас гарсан responseSessionId-г л дамжуулдаг).
export interface SurveyEmailRequest {
  responseId: string;
  surveyId: string;
  email: string;
}
