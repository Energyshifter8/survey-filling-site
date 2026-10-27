import type { BrowserInfo } from "@/lib/api/types";

const DEVICE_ID_KEY = "survey_device_id";

/** Тогтвортой per-browser device id (localStorage-д хадгална, tab/refresh
 *  хооронд алдагдахгүй) + navigator.userAgent-ийг BrowserInfo болгож буцаана.
 *  Decompiled bundle-ээр баталгаажсан (2026-09): participate/check-pass бүгд
 *  { deviceId, browser, passCode } body шаарддаг. */
export function getBrowserInfo(passCode = ""): BrowserInfo {
  let deviceId = "";
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY) ?? "";
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch {
    // localStorage хаагдсан (private mode гэх мэт) — session-only id рүү унана.
    deviceId = crypto.randomUUID();
  }

  return {
    deviceId,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    passCode,
  };
}

/** Recruitment-ийн BrowserInfo.browser нь Swagger дээр maxLength 50 — бүтэн
 *  userAgent (ихэвчлэн 100+ тэмдэгт) validation-д унана. Бодит frontend ч
 *  userAgent-ээс зөвхөн хөтчийн нэрийг ("Chrome" гэх мэт) илгээдэг. Дараалал
 *  чухал: Edge/Opera-ийн UA дотор "Chrome/", Chrome-ийн UA дотор "Safari/"
 *  мөн байдаг тул илүү тодорхойгоос нь эхэлж шалгана. */
export function getBrowserName(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("SamsungBrowser/")) return "Samsung Internet";
  if (ua.includes("Firefox/") || ua.includes("FxiOS/")) return "Firefox";
  if (ua.includes("Chrome/") || ua.includes("CriOS/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  return "Unknown";
}
