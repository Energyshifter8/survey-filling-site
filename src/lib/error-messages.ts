import { ApiError } from "@/lib/api/client";

/** Backend-ийн "дуу хоолой" биш, интерфэйсийн энгийн, тодорхой мессеж рүү хөрвүүлнэ.
 *  Уучлалт гуйхгүй — юу болсныг л хэлнэ. */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Холболт тасарлаа. Интернэт холболтоо шалгаад дахин оролдоно уу.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Судалгаанд орох хугацаа дууссан байна. Холбоосыг дахин нээж эхнээс эхлүүлнэ үү.";
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
