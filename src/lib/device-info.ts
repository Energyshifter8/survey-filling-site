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
