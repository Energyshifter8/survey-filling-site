"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { sendBrowserEvents } from "@/lib/api/recruitment";
import type { BrowserEvent, BrowserEventType, QuestionAnswerRequest } from "@/lib/api/recruitment-types";

// Талент үнэлгээний явцын хяналт — бодит frontend
// (survey-staging.mindxplus.com/talent/[token]-ийн bundle)-тэй ижил зарчим:
// асуулт бөглөж байх үед л (intro/бэлэн байдлын дэлгэц дээр биш) цонхны focus
// алдах, tab нуугдах, copy/cut/paste, fullscreen-ээс гарахыг BrowserEvent
// болгон цуглуулж, batch-events endpoint руу багцлан илгээнэ.

// Swagger: "maxBatchSize = 50".
const MAX_BATCH_SIZE = 50;
// Бодит frontend 5 секунд тутам (мөн submit-ийн өмнө) илгээдэг.
const FLUSH_INTERVAL_MS = 5000;
// Илгээлт амжилтгүй бол сервер рүү давтан цохихгүйн тулд түр хүлээнэ
// (бодит frontend-ийн 30 секундтэй ижил).
const RETRY_BACKOFF_MS = 30000;
// Сүлжээ удаан тасарвал санах ойд хязгааргүй өсөхөөс сэргийлнэ.
const MAX_QUEUE_SIZE = 500;

/** Асуулт бөглөх үеийн browser event-үүдийг цуглуулж илгээнэ. `active` false
 *  үед listener огт бүртгэхгүй. `testAnswerId` — одоогийн TestQuestions.id
 *  (эсвэл CustomQuestionSection.id). */
export function useBrowserEventTracker({
  active,
  sessionId,
  authorization,
  testAnswerId,
}: {
  active: boolean;
  sessionId: string | undefined;
  authorization: string | undefined;
  testAnswerId: string | undefined;
}) {
  const queueRef = useRef<BrowserEvent[]>([]);
  const backoffUntilRef = useRef(0);
  // Listener-үүд нэг л удаа бүртгэгдэх тул хамгийн сүүлийн утгуудыг ref-ээр уншина.
  const contextRef = useRef({ sessionId, authorization, testAnswerId });
  useEffect(() => {
    contextRef.current = { sessionId, authorization, testAnswerId };
  }, [sessionId, authorization, testAnswerId]);

  const track = useCallback(
    (eventType: BrowserEventType, metadata?: Record<string, string | number>, questionId?: number) => {
      const { testAnswerId: currentTestAnswerId } = contextRef.current;
      if (!currentTestAnswerId) return;
      const event: BrowserEvent = {
        eventType,
        testAnswerId: currentTestAnswerId,
        questionId,
        metadata: metadata
          ? Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]))
          : undefined,
      };
      queueRef.current.push(event);
      if (queueRef.current.length > MAX_QUEUE_SIZE) queueRef.current.shift();
    },
    [],
  );

  /** `force` — backoff-ыг үл тоон заавал илгээнэ (submit-ийн өмнө, хуудас хаагдахад). */
  const flush = useCallback(async ({ force = false, keepalive = false } = {}) => {
    const { sessionId: currentSessionId, authorization: currentAuthorization } = contextRef.current;
    if (!currentSessionId || !currentAuthorization) return;
    if (!force && Date.now() < backoffUntilRef.current) return;
    while (queueRef.current.length > 0) {
      const batch = queueRef.current.splice(0, MAX_BATCH_SIZE);
      try {
        await sendBrowserEvents(currentSessionId, currentAuthorization, batch, { keepalive });
      } catch {
        // Event алдагдахаас илүү давтан илгээх нь дээр — дараагийн flush-д дахин оролдоно.
        queueRef.current.unshift(...batch);
        backoffUntilRef.current = Date.now() + RETRY_BACKOFF_MS;
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    // Queue массив өөрөө солигддоггүй (зөвхөн push/splice) тул cleanup-д ч ижил массив.
    const queue = queueRef.current;
    let blurredAt: number | null = null;
    let hiddenAt: number | null = null;
    const secondsSince = (since: number) => Math.round((Date.now() - since) / 1000);
    const selectionLength = () => window.getSelection()?.toString().length ?? 0;

    const onBlur = () => {
      if (blurredAt === null) blurredAt = Date.now();
    };
    const onFocus = () => {
      if (blurredAt === null) return;
      track("WINDOW_FOCUS_LOST", { seconds: secondsSince(blurredAt) });
      blurredAt = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        track("PAGE_VISIBILITY_HIDDEN", { seconds: secondsSince(hiddenAt) });
        hiddenAt = null;
      }
    };
    const onCopy = () => track("COPY", { chars: selectionLength() });
    const onCut = () => track("CUT", { chars: selectionLength() });
    const onPaste = (e: ClipboardEvent) => track("PASTE", { chars: e.clipboardData?.getData("text").length ?? 0 });
    const onPageHide = () => {
      void flush({ force: true, keepalive: true });
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    window.addEventListener("pagehide", onPageHide);
    const interval = setInterval(() => {
      if (queueRef.current.length > 0) void flush();
    }, FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
      if (blurredAt !== null) track("WINDOW_FOCUS_LOST", { seconds: secondsSince(blurredAt) });
      if (queue.length > 0) void flush({ force: true });
    };
  }, [active, track, flush]);

  return { track, flush };
}

/** Fullscreen шаардлага (бодит frontend-тэй адил): `active` үед fullscreen биш
 *  бол `required` true болж, page overlay харуулна. Fullscreen-ийг зөвхөн
 *  хэрэглэгчийн товч дарсан gesture дотроос асааж болдог тул `enter`-ийг
 *  товчны onClick-оос дуудна. iPhone Safari гэх мэт document fullscreen-ийг
 *  огт дэмждэггүй орчинд (`fullscreenEnabled` false) шаардлагагүй гэж үзнэ. */
export function useFullscreenGuard(active: boolean, onExit: () => void) {
  // useSyncExternalStore-ийн server snapshot (fullscreen: true, supported: false)
  // нь hydration-ийн эхний render-т overlay харуулахгүй байлгана — client дээр
  // бодит утга руу дараа нь шилжинэ.
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement != null,
    () => true,
  );
  const supported = useSyncExternalStore(
    subscribeNever,
    () => document.fullscreenEnabled === true,
    () => false,
  );

  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!active) return;
    const onChange = () => {
      if (document.fullscreenElement == null) onExitRef.current();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [active]);

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Хэрэглэгч/browser татгалзсан — overlay хэвээр үлдэж дахин оролдох боломжтой.
    }
  }, []);

  return { required: active && supported && !isFullscreen, enter };
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function subscribeNever() {
  return () => {};
}

/** Fullscreen-ийг хэрэглэгчийн gesture (товч дарах) дотроос асаана — бэлэн
 *  байдлын дэлгэцээс /test руу шилжихийн өмнө дуудна. Дэмжихгүй/татгалзсан
 *  бол чимээгүй өнгөрнө (/test дээрх useFullscreenGuard дахин асууна). */
export async function requestFullscreenSafely() {
  try {
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // татгалзсан — /test дээрх overlay дахин асууна
  }
}

interface EngagementMetrics {
  firstShownAt?: number;
  visibleMs: number;
  firstInteractionMs?: number;
  lastAnsweredAt?: number;
  selectionCount: number;
}

/** QuestionAnswerRequest-ийн engagement талбаруудыг (duration, visibleMs,
 *  firstInteractionMs, changeCount) асуулт бүрээр хэмжинэ.
 *  - visibleMs: асуулт дэлгэц дээр (tab нуугдаагүй үед) харагдсан нийт хугацаа.
 *  - firstInteractionMs: анх харагдсанаас анхны хариулт хүртэлх хугацаа.
 *  - changeCount: сонголтот асуултад анхны сонголтоос хойш хэдэн удаа өөрчилсөн
 *    (бичвэрийн асуултад товчлуур бүрийг "өөрчлөлт" гэж тоолох нь утгагүй тул илгээхгүй).
 *  - duration (секунд, заавал): анх харагдсанаас сүүлийн хариулт хүртэл.
 *  Refresh хийвэл санах ой дахь хэмжүүр алдагдана (хариултууд өөрөө
 *  localStorage-д хадгалагдсан хэвээр). */
export function useQuestionEngagement(visibleQuestionIds: number[], active: boolean) {
  const metricsRef = useRef<Record<number, EngagementMetrics>>({});
  const visibleIdsRef = useRef<number[]>([]);
  const visibleSinceRef = useRef<number | null>(null);

  const metricFor = useCallback((questionId: number) => {
    metricsRef.current[questionId] ??= { visibleMs: 0, selectionCount: 0 };
    return metricsRef.current[questionId];
  }, []);

  const accumulateVisible = useCallback(() => {
    const since = visibleSinceRef.current;
    if (since === null) return;
    const elapsed = Date.now() - since;
    for (const id of visibleIdsRef.current) metricFor(id).visibleMs += elapsed;
    visibleSinceRef.current = null;
  }, [metricFor]);

  const idsKey = visibleQuestionIds.join(",");
  useEffect(() => {
    if (!active || !idsKey) return;
    const ids = idsKey.split(",").map(Number);
    const now = Date.now();
    for (const id of ids) metricFor(id).firstShownAt ??= now;
    visibleIdsRef.current = ids;
    visibleSinceRef.current = document.hidden ? null : now;

    const onVisibilityChange = () => {
      if (document.hidden) accumulateVisible();
      else visibleSinceRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      accumulateVisible();
      visibleIdsRef.current = [];
    };
  }, [idsKey, active, metricFor, accumulateVisible]);

  const noteAnswer = useCallback(
    (questionId: number, kind: "choice" | "text") => {
      const metric = metricFor(questionId);
      const now = Date.now();
      if (metric.firstInteractionMs === undefined && metric.firstShownAt !== undefined) {
        metric.firstInteractionMs = now - metric.firstShownAt;
      }
      metric.lastAnsweredAt = now;
      if (kind === "choice") metric.selectionCount += 1;
    },
    [metricFor],
  );

  /** Submit хийх мөчийн хэмжүүр — одоо харагдаж буй батчийн явж буй хугацааг
   *  ч оруулна (цагийг зогсоолгүй). */
  const metricsForSubmit = useCallback(
    (
      questionId: number,
      answered: boolean,
    ): Pick<QuestionAnswerRequest, "duration" | "visibleMs" | "firstInteractionMs" | "changeCount"> => {
      if (visibleSinceRef.current !== null) {
        accumulateVisible();
        visibleSinceRef.current = Date.now();
      }
      const metric = metricFor(questionId);
      const spentMs =
        metric.lastAnsweredAt !== undefined && metric.firstShownAt !== undefined
          ? metric.lastAnsweredAt - metric.firstShownAt
          : metric.visibleMs;
      const seconds = Math.round(spentMs / 1000);
      return {
        duration: answered ? Math.max(1, seconds) : Math.max(0, seconds),
        visibleMs: metric.visibleMs,
        firstInteractionMs: metric.firstInteractionMs,
        changeCount: metric.selectionCount > 0 ? metric.selectionCount - 1 : undefined,
      };
    },
    [accumulateVisible, metricFor],
  );

  const reset = useCallback(() => {
    metricsRef.current = {};
  }, []);

  return { noteAnswer, metricsForSubmit, reset };
}
