import type { BrowserInfo } from "@/lib/api/types";

const DEVICE_ID_KEY = "mindx_survey_device_id";

/** Returns (and persists) a stable per-browser device id, plus the UA string, for BrowserInfo payloads. */
export function getBrowserInfo(passCode?: string): BrowserInfo {
  let deviceId = "";
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY) ?? "";
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch {
    // localStorage unavailable (private mode, SSR) - fall back to a session-only id.
    deviceId = crypto.randomUUID();
  }

  return {
    deviceId: deviceId.slice(0, 50),
    browser: (typeof navigator !== "undefined" ? navigator.userAgent : "unknown").slice(0, 50),
    ...(passCode ? { passCode } : {}),
  };
}
