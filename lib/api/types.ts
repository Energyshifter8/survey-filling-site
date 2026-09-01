// Types mirrored from the Mindx+ response collector service OpenAPI spec
// (GET /v3/api-docs on the API host configured via NEXT_PUBLIC_API_URL, tag: "Survey").

export interface BrowserInfo {
  deviceId: string;
  browser: string;
  passCode?: string;
}

export type PageSection = "START" | "TEST" | "END";
export type PageType = "INFO" | "SURVEY_START" | "TIP" | "SURVEY_END";

export interface PageDTO {
  id?: number;
  qnSection: PageSection;
  pageType: PageType;
  title: string;
  content?: string;
  btnLabel: string;
  pageOrder: number;
  data?: Record<string, string>;
}

export type DesignOwnerType = "SURVEY" | "SURVEY_TEMPLATE" | "HIRING_TEST" | "RECRUITMENT";
export type ThemeType = "LIGHT" | "YALE" | "DARK" | "MIRAGE" | "PURPLE";
export type ImagePosition = "TOP_LEFT" | "TOP_MIDDLE" | "TOP_RIGHT";

export interface DesignDTO {
  id?: number;
  designOwnerId?: string;
  designOwnerType?: DesignOwnerType;
  themeType?: ThemeType;
  imagePosition?: ImagePosition;
  showAppLogo?: boolean;
  hasLogo?: boolean;
  logoUrl?: string;
}

export interface SurveyPublicDto {
  id: string;
  passCodeProtected: boolean;
  canParticipate: boolean;
  message?: string;
  expired: boolean;
  deviceCheck: boolean;
  questionCount: number;
  minMinutes: number;
  maxMinutes: number;
  pageSize: number;
  creator: string;
  hasAssessment: boolean;
  design?: DesignDTO;
  /** Pages grouped by qnSection (START/TEST/END); use `findSurveyPage` to pick one by pageType. */
  pages: Partial<Record<PageSection, PageDTO[]>>;
}

export interface TakeSurvey {
  survey: SurveyPublicDto;
  taken: boolean;
}

export interface SurveyToken {
  responseSessionId: string;
  token: string;
}

export type QuestionType =
  | "MULTI_CHOICE"
  | "SINGLE_CHOICE"
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

export type OptionTag = "I" | "E" | "S" | "N" | "T" | "F" | "J" | "P";

export interface QuestionOptionDTO {
  id: number;
  order?: number;
  content: string;
  point?: number;
  tag?: OptionTag;
  nextQuestionId?: number;
}

export interface MatrixRowDTO {
  id: number;
  order?: number;
  content: string;
  rowOrder?: number;
}

export interface Condition {
  questionId?: number;
  options?: number[];
}

export interface QuestionWithRule {
  id: number;
  content: string;
  description?: string;
  minAnswerCount?: number;
  maxAnswerCount?: number;
  questionType: QuestionType;
  section: QuestionSection;
  options?: QuestionOptionDTO[];
  matrixRows?: MatrixRowDTO[];
  questionOrder: number;
  isRequired: boolean;
  toBeAssessed?: boolean;
  nextQuestionId?: number;
  isConditional?: boolean;
  /** Conditional-display rule (branching on a prior answer). Not evaluated yet - see useSurveyQuestions TODO. */
  show?: Condition;
  questionOrderWithSectionValue?: number;
}

export interface SurveyQuestionsDTO {
  customQuestionFirst?: QuestionWithRule[];
  customQuestionLast?: QuestionWithRule[];
  questions: QuestionWithRule[];
}

export interface AnswerChoice {
  questionId: number;
  rowId?: number;
  optionId?: number;
  questionType: QuestionType;
  content?: string;
  duration: number;
  factorId?: number;
  toBeAssessed?: boolean;
  points?: number;
  tag?: string;
}

export interface SurveyResponseSubmission {
  templateQuestionAnswers: AnswerChoice[];
  customQuestionAnswers?: AnswerChoice[];
  sessionId?: string;
  surveyId?: string;
}

export interface EmailResponse {
  responseId: string;
  surveyId: string;
  email: string;
}

export interface CustomerFeedback {
  rate?: number;
  comment?: string;
  referenceId?: string;
  testId?: string;
  type?: "PERSONAL_REPORT" | "SURVEY";
}

export interface RestResponseVoid {
  message?: string;
  status?: number;
  success?: boolean;
  data?: unknown;
}
