// UX telemetry helper — заавал биш (PROMPT.md), гэхдээ дараа амархан нэмэгдэх
// боломжтой байхаар нэг цэгт төвлөрүүлсэн. Survey модульд batch-events/beacon
// endpoint одоогоор баримтжаагүй тул энэ нь зөвхөн console.debug рүү бичдэг
// no-op stub — жинхэнэ endpoint тодорхой болмогц доторх TODO-г бөглөнө.
export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[survey-telemetry]", name, data ?? {});
  }
  // TODO: жинхэнэ endpoint баталгаажвал энд navigator.sendBeacon(...) залгах.
}
