import { ApiError } from "@/lib/api/client";

/** Аль дуудлага дээр алдаа гарсныг илэрхийлнэ.
 *  - "public": resolveShortUrl / participateSurvey / checkPass — Bearer token
 *    ЭДГЭЭР дуудлагад ХАРАГДАХГҮЙ (checkPass бол яг token олгож буй дуудлага).
 *  - "authenticated": getSurveyQuestions / submitSurveyResponse — Authorization:
 *    Bearer header-тэй, тиймээс "token хүчингүй/дууссан" гэсэн тайлбар зөвхөн
 *    эндээс ирсэн 401/403 дээр л үнэн байж болно. */
export type ApiCallStage = "public" | "authenticated";

/** Bodit staging дээр баталгаажсан (2026-09-07, GET /public/survey/{id}/questions):
 *  token хугацаа дууссан алдаа ЗААВАЛ 401 биш ирдэг — 400 BAD_REQUEST,
 *  code:"validation_error", message:"Шинжилгээ илгээх токены хугацаа дууссан
 *  байна" хэлбэрээр ч ирж болохыг бодит response нотолсон. Тиймээс зөвхөн
 *  status-аар (401/403) дүгнэхэд хангалтгүй — body.message-ийг ч шалгана. */
export function isTokenExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401 || error.status === 403) return true;
  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    return typeof message === "string" && message.includes("хугацаа дууссан");
  }
  return false;
}

/** Backend-ийн "дуу хоолой" биш, интерфэйсийн энгийн, тодорхой мессеж рүү хөрвүүлнэ.
 *  Уучлалт гуйхгүй — юу болсныг л хэлнэ.
 *
 *  2026-09-02: бодит shortUrl-аар (`Ew3kamqxsflGK6ly1H7p0`) `GET /s/{shortUrl}`-г
 *  curl-аар (мөн client.ts-тай яг адилхан fetch дуудлагаар) шалгахад HTTP 401,
 *  Content-Length: 0 ирсэн — өөрөөр хэлбэл backend 401 дээр ЮУ Ч тодруулга
 *  (EXPIRED статус, алдааны мессеж) илгээдэггүй. Энэ бол `resolveShortUrl`
 *  (token/session хараахан үүсээгүй, хамгийн эхний дуудлага) дээр тохиолдсон
 *  тул "Судалгаанд орох хугацаа дууссан" гэдэг тайлбар ХУДАЛ байсан — token
 *  хараахан байгаагүй тул дуусах зүйл ч байгаагүй. Тиймээс "session/token
 *  дууссан" гэсэн тайлбарыг зөвхөн Bearer шаардсан дуудлага дээр л (stage
 *  "authenticated") ашиглана; бусад тохиолдолд backend юу ч хэлээгүй тул
 *  шалтгааныг зөв тодорхойгүй гэдгээр нь хэлнэ. */
export function getFriendlyErrorMessage(error: unknown, stage: ApiCallStage = "public"): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Холболт тасарлаа. Интернэт холболтоо шалгаад дахин оролдоно уу.";
    }
    if (error.status === 401 || error.status === 403) {
      return stage === "authenticated"
        ? "Судалгаанд орох хугацаа дууссан байна. Холбоосыг дахин нээж эхнээс эхлүүлнэ үү."
        : "Энэ судалгаанд хандах хүсэлт биелсэнгүй (алдааны код: 401). Холбоос буруу, нэвтрэх код шаардлагатай, эсвэл судалгаа идэвхгүй байж болзошгүй.";
    }
    if (error.status === 404) {
      return "Судалгаа олдсонгүй. Холбоос буруу эсвэл судалгаа устсан байж болзошгүй.";
    }
    if (error.status === 429) {
      return "Хэт олон хүсэлт илгээгдлээ. Хэдэн минутын дараа дахин оролдоно уу.";
    }
    if (error.status >= 500) {
      return "Серверт алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.";
    }
    return `Хүсэлт биелсэнгүй (алдааны код: ${error.status}). Дахин оролдоно уу.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Тодорхойгүй алдаа гарлаа. Дахин оролдоно уу.";
}
