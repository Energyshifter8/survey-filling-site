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
// шалгасан (participate/check-pass/questions).
//
// "// confirmed 2026-09-04 (Swagger)" гэж тэмдэглэсэн бүгд
// https://collector-staging.mindxplus.com/v3/api-docs (OpenAPI 3.0 JSON,
// Swagger UI-ийн ард байгаа албан ёсны schema) руу шууд орж component
// schema-уудыг (SurveyPublicDto, DesignDTO, PageDTO, SurveyQuestionsDTO,
// QuestionWithRule, QuestionOptionDTO, AnswerChoice) уншиж баталгаажуулсан —
// энэ нь decompiled bundle-ээс ч илүү найдвартай эх сурвалж, ялангуяа
// enum-уудын БҮХ боломжит утгыг олоход (bundle зөвхөн тухайн жишээ
// судалгаанд гарсан утгыг л харуулдаг байсан). Тэмдэглэлгүй үлдсэн зүйл л
// хараахан баталгаагүй.

export interface BrowserInfo {
  deviceId: string;
  browser: string;
  passCode?: string;
}

// confirmed 2026-09-04 (Swagger): PageDTO.qnSection-ийн бүрэн enum. Өмнө
// зөвхөн "START" | "END" гэж тэмдэглэсэн байсан нь БУРУУ/дутуу байсан —
// "TEST" (асуултын хуудсуудын хэсэг) бас байдаг.
export type SurveyPageSection = "START" | "TEST" | "END";

// confirmed 2026-09-04 (Swagger): PageDTO.pageType-ийн бүрэн enum.
export type SurveyPageType = "INFO" | "SURVEY_START" | "TIP" | "SURVEY_END";

// confirmed 2026-09-02: survey.pages.{START,END}[0]-ийн бүтэц — "Ажилтны сайн
// сайхан байдал" мэтийн гарчиг ЭНДЭЭС ирдэг (асуулт дээрх category талбар
// БИШ — QuestionWithRule дээр category гэсэн зүйл огт байхгүй, доорхыг үз).
export interface SurveyPageDTO {
  id: number;
  qnSection: SurveyPageSection;
  pageType: SurveyPageType;
  // confirmed 2026-09-04 (Swagger): PageDTO-ийн "required" жагсаалт нь зөвхөн
  // ["btnLabel","pageOrder","pageType","qnSection"] — title/content/data
  // бүгд заавал биш.
  title?: string;
  content?: string;
  btnLabel: string;
  pageOrder: number;
  data?: Record<string, string>;
}

// confirmed 2026-09-04 (Swagger): DesignDTO.themeType-ийн БҮХ боломжит утга
// (5ш). survey-staging.mindxplus.com/s/6LHGglUU1cEVDIkxj0z36W/questions
// дээр хөх дэвсгэр (#4D6AA6) + улбар шар товч (#FF8A00) харагдсан нь эдгээрийн
// аль нэг (MIRAGE/YALE магадлалтай) — гэхдээ ЯГ аль нь идэвхтэй байгааг
// Swagger schema заадаггүй тул бодит response шаардлагатай.
export type SurveyThemeType = "LIGHT" | "YALE" | "DARK" | "MIRAGE" | "PURPLE";

// confirmed 2026-09-04 (Swagger): DesignDTO.designOwnerType-ийн бүрэн enum —
// нэг design schema нь survey, survey template, elselection/hiring test,
// recruitment 4 өөр эзэмшигч төрлийг хуваалцдаг гэсэн үг.
export type SurveyDesignOwnerType = "SURVEY" | "SURVEY_TEMPLATE" | "HIRING_TEST" | "RECRUITMENT";

// confirmed 2026-09-04 (Swagger): DesignDTO.imagePosition-ийн бүрэн enum.
export type SurveyImagePosition = "TOP_LEFT" | "TOP_MIDDLE" | "TOP_RIGHT";

// confirmed 2026-09-04 (Swagger): DesignDTO-ийн "required" жагсаалт огт
// байхгүй тул бүх талбар заавал биш гэж үзнэ. "logoUrl" талбар өмнө дутуу
// байсан — Swagger-д байгааг олж нэмэв.
export interface SurveyDesignDTO {
  id?: number;
  designOwnerId?: string;
  designOwnerType?: SurveyDesignOwnerType;
  themeType?: SurveyThemeType;
  imagePosition?: SurveyImagePosition;
  showAppLogo?: boolean;
  hasLogo?: boolean;
  logoUrl?: string;
}

// confirmed 2026-09-04 (Swagger): SurveyPublicDto.status-ийн бүрэн enum.
export type SurveyStatus = "CREATED" | "PUBLISHING" | "PUBLISHED" | "CLOSED" | "SUSPENDED";

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
  // ЗАСВАР (2026-09-04): өмнөх коммент "1 page-д яг 1 асуулт байдгийг
  // баталгаажуулсан" гэсэн нь БУРУУ байсан. Бодит браузер тестээр (111
  // асуулттай "Монгол хүний сайн сайхан байдлын цогц судалгаа" судалгаан
  // дээр) "Цааш" дарахад яг 10 асуулт нэг дэлгэцэд зэрэг харагдаж, дараа нь
  // "Үргэлжлүүлэх" товч гарсан — өөрөөр хэлбэл pageSize нь survey бүрээр
  // ӨӨР БАЙЖ БОЛОХ тохиргоо. decompiled bundle-ийн эх код
  // (`pageSize = survey?.pageSize ?? 1`) болон Swagger хоёулаа нийцэж
  // байна: талбар нь заавал биш (SurveyPublicDto-ийн "required" жагсаалт
  // хоосон), Swagger дээр ямар ч default утга зарлаагүй тул frontend өөрөө
  // "байхгүй бол 1" гэсэн fallback-тай. `/questions` endpoint (SurveyQuestionsDTO)
  // өөрөө ямар ч pageSize/currentPage/totalPages талбар буцаадаггүй — өөрөөр
  // хэлбэл асуултуудыг хуудаслах (pagination) бүрэн frontend-ийн client-side
  // логик бөгөөд зөвхөн ЭНЭ тоог л survey-level config-оос уншдаг.
  pageSize?: number;
  creator?: string;
  hasAssessment?: boolean;
  design?: SurveyDesignDTO;
  pages?: Partial<Record<SurveyPageSection, SurveyPageDTO[]>>;
  status?: SurveyStatus;
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
  // confirmed 2026-09-04 (Swagger): QuestionWithRule.questionType-ийн БҮХ 11
  // боломжит утга — эдгээр нь одоо зөвхөн таамаг биш, backend-ийн албан
  // ёсны enum. Бодит судалгаанд (2026-09-02) гарч харсан нь: SINGLE_CHOICE,
  // STAR_RATING, NUMBER_RATING. Бусад нь Swagger-ээр батлагдсан ч энэ
  // codebase-ийн UI хараахан бүгдийг нь render хийж туршаагүй.
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

// confirmed 2026-09-04 (Swagger): QuestionOptionDTO.tag болон
// AnswerChoice.tag-д ашиглагдах МBTI-маягийн 8 хэмжигдэхүүн (Introvert/
// Extrovert, Sensing/iNtuition, Thinking/Feeling, Judging/Perceiving).
// АНХААР: AnswerChoice.tag Swagger дээр зүгээр "string" гэж type-логдсон
// (enum constraint-гүй) — гэхдээ практикт QuestionOptionDTO.tag-тай ижил 8
// утгын аль нэгийг л агуулна гэж таамаглаж болно.
export type QuestionOptionTag = "I" | "E" | "S" | "N" | "T" | "F" | "J" | "P";

export interface QuestionOptionDTO {
  // confirmed 2026-09-02. "order" — сонголтын харагдах дараалал (star/numeric
  // rating дээр ЭНЭ дарааллаар од/тоо render хийнэ). "point" — оноо (submit
  // логикт одоогоор ашиглагдахгүй, урд нь бэлдсэн).
  id: number;
  order: number;
  content: string;
  point: number;
  // confirmed 2026-09-04 (Swagger): өмнө дутуу байсан 2 талбар. "tag" —
  // MBTI-маягийн scoring (доорхыг үз). "nextQuestionId" — энэ сонголтыг
  // сонговол conditional/branching логикоор дараа нь ямар асуулт руу үсрэхийг
  // заана (submit логикт одоогоор ашиглагдахгүй).
  tag?: QuestionOptionTag;
  nextQuestionId?: number;
}

// confirmed 2026-09-04 (Swagger): MatrixRowDTO — QuestionWithRule.questionType
// === "MATRIX" үед ашиглагдах мөрүүдийн schema (өмнө огт тэмдэглэгдээгүй
// байсан).
export interface MatrixRowDTO {
  id: number;
  order: number;
  content: string;
  rowOrder: number;
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
  // confirmed 2026-09-04 (Swagger): өмнө дутуу байсан 3 талбар.
  // "matrixRows" — questionType MATRIX үед ашиглагдана. "toBeAssessed" болон
  // "show" — зорилго нь одоогоор тодорхойгүй (нэмэлт assessment/branching-
  // тэй холбоотой байж болзошгүй, submit логикт одоогоор ашиглагдахгүй).
  matrixRows?: MatrixRowDTO[];
  toBeAssessed?: boolean;
  show?: boolean;
}

// ЗАСВАР (2026-09-04, Swagger): доор байсан "TODO: confirm — асуултууд шууд
// массив байж болзошгүй" гэсэн эргэлзээ арилсан. Swagger schema яг энэ
// 3-талбартай wrapper объектыг баталгаажуулж байна (bare array биш).
// АНХААР: Swagger-ийн "required" жагсаалт SurveyQuestionsDTO-д огт байхгүй
// тул "questions" талбар техникийн хувьд ч заавал биш — гэхдээ бодит
// endpoint (`/public/survey/{responseSessionId}/questions`) дуудахад энэ нь
// үргэлж ирдэг тул non-optional хэвээр үлдээв. Мөн энэ response-д ямар ч
// pageSize/currentPage/totalPages талбар байхгүй (дээрх SurveyPublicDto.pageSize-ийг үз).
export interface SurveyQuestionsDTO {
  customQuestionFirst?: QuestionWithRule[];
  questions: QuestionWithRule[];
  customQuestionLast?: QuestionWithRule[];
}

// ЗАСВАР (2026-09-04, Swagger): доор байсан "TODO: confirm" арилж, бодит
// AnswerChoice schema бүрэн олдов. "required" жагсаалт нь ["duration",
// "questionId"] — бусад бүгд заавал биш. "rowId" — MATRIX асуултын аль
// мөрийг сонгосныг заана (optionId-той хамт хэрэглэгдэнэ). "content" —
// TEXT/TEXT_INPUT/LONG_TEXT/NUMBER_INPUT төрлийн чөлөөт бичвэр хариулт
// (maxLength 500). "factorId"/"points"/"tag"/"toBeAssessed" — submit
// логикт одоогоор ашиглагдахгүй, зорилго тодорхойгүй нэмэлт талбарууд.
export interface AnswerChoice {
  questionId: number;
  rowId?: number;
  optionId?: number;
  questionType?: QuestionType;
  content?: string;
  duration: number;
  factorId?: number;
  toBeAssessed?: boolean;
  points?: number;
  tag?: QuestionOptionTag;
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
