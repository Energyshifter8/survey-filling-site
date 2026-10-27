import type { LocalAnswer } from "@/components/QuestionField";
import type { RecruitmentDTO } from "@/lib/api/recruitment-types";

// Талент үнэлгээний төлөв хадгалах арга: localStorage (survey-ийн
// sessionStorage-аас ЗОРИУДААР өөр — src/lib/survey-session.ts-ийг үз).
//
// Яагаад: үнэлгээг "зөвхөн нэг удаа эхлүүлэх боломжтой" (бодит frontend-ийн
// бэлэн байдлын дэлгэцийн текст) — талент tab-аа хаагаад/browser-оо дахин
// нээгээд урилгын линкээ дахин дарахад эхнээс биш, зогссон тестээсээ
// үргэлжлүүлэх ёстой. sessionStorage tab хаагдахад устдаг тул тохирохгүй.
// Бодит frontend ч мөн адил localStorage (`recruitmentInfo_{token}`) ашигладаг.
// Түлхүүр бүр урилгын token-оор тусгаарлагдсан тул нэг browser дээр өөр
// урилгууд хоорондоо холилдохгүй.

export interface TalentState {
  invitationId: string;
  info: RecruitmentDTO;
  // Бэлэн байдлын дэлгэц дээр "Эхлэх" дарсан эсэх — үүнээс хойш нүүр хуудас
  // руу дахин орвол intro-г алгасаад шууд /test руу шилжинэ.
  started: boolean;
  submittedTestIds: string[];
  customSubmitted: boolean;
}

// Одоо бөглөж буй хэсгийн (тест эсвэл нэмэлт асуулт) хариултууд — refresh
// хийхэд алдагдахгүй байхын тулд. `stageKey` таарахгүй бол (өөр тест рүү
// шилжсэн) хуучин progress-ийг үл тооно.
export interface TalentProgress {
  stageKey: string;
  batchIndex: number;
  answers: Record<number, LocalAnswer>;
}

function stateKey(token: string) {
  return `talent_state_${token}`;
}

function progressKey(token: string) {
  return `talent_progress_${token}`;
}

function completedKey(token: string) {
  return `talent_completed_${token}`;
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage хаагдсан (private mode гэх мэт) — дахин фетчлэх л шийдэл
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // хадгалах боломжгүй бол чимээгүй унана — refresh дээр эхнээс эхэлнэ
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // хадгалагдаагүй байсан бол устгах ч зүйл алга
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveTalentState(token: string, state: TalentState) {
  safeSet(stateKey(token), JSON.stringify(state));
}

export function loadTalentState(token: string): TalentState | null {
  return safeParse<TalentState>(safeGet(stateKey(token)));
}

export function saveTalentProgress(token: string, progress: TalentProgress) {
  safeSet(progressKey(token), JSON.stringify(progress));
}

export function loadTalentProgress(token: string): TalentProgress | null {
  return safeParse<TalentProgress>(safeGet(progressKey(token)));
}

export function clearTalentProgress(token: string) {
  safeRemove(progressKey(token));
}

/** Token хүчингүй болсон (check-token false/401) үед — эхнээс нь (load → info)
 *  дахин эхлүүлэх боломж үлдээж, хуучирсан төлөвийг бүрэн устгана. */
export function clearTalentSession(token: string) {
  safeRemove(stateKey(token));
  safeRemove(progressKey(token));
}

/** Бүх хэсэг амжилттай илгээгдсэний дараа: Bearer token зэрэг төлөвийг устгаж,
 *  зөвхөн "дууссан" тэмдэглэгээг үлдээнэ (дахин нээхэд дууссан дэлгэц харуулна). */
export function markTalentCompleted(token: string) {
  clearTalentSession(token);
  safeSet(completedKey(token), "1");
}

export function isTalentCompleted(token: string): boolean {
  return safeGet(completedKey(token)) === "1";
}
