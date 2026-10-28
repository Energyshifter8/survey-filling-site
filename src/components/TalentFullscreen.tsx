"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { TalentPrimaryButton } from "@/components/TalentScreens";
import { manrope } from "@/lib/fonts";
import { TALENT_TEXT } from "@/lib/helptext";

// Талент үнэлгээний fullscreen шаардлага — бодит frontend-ийн
// (survey-staging.mindxplus.com/talent/[token], 2026-10-28-ны bundle) зан төлөв:
//  - Хуудас ачаалагдмагц "Fullscreen горим шаардлагатай" prompt нээлттэй байна;
//    "Зөвшөөрөх" нь fullscreen асааж (амжилтгүй болсон ч) prompt-ыг хаана.
//  - Welcome/мэдээллийн хуудас/бэлэн байдлын товч бүр fullscreen унтраастай
//    бол асаана (`ensure`).
//  - "Fullscreen горимоос гарсан байна" overlay нь зөвхөн fullscreen-д БАЙСАН
//    хэрэглэгч гарсан үед л гарна — огт ороогүй бол харуулахгүй.
// Layout-д байрладаг тул төлөв нь /talent/[token] → /test шилжилтэд хадгалагдана
// (client-side шилжилтэд document fullscreen ч хэвээр үлддэг).
// Document fullscreen-ийг огт дэмждэггүй орчинд (iPhone Safari) prompt харуулахгүй.

interface TalentFullscreenValue {
  /** Prompt эсвэл exit overlay нээлттэй — асуултын engagement-ийг зогсооход ашиглана. */
  blocking: boolean;
  /** Fullscreen унтраастай бол асаана. Товчны onClick дотроос (await-аас өмнө) дуудна. */
  ensure: () => void;
  /** Fullscreen-ээс гарах бүрт дуудагдах listener бүртгэнэ; цуцлах функц буцаана. */
  onExit: (listener: () => void) => () => void;
}

const TalentFullscreenContext = createContext<TalentFullscreenValue | null>(null);

interface OverlayState {
  promptOpen: boolean;
  exited: boolean;
  enter: () => Promise<void>;
  accept: () => Promise<void>;
}

const TalentFullscreenOverlayContext = createContext<OverlayState | null>(null);

export function TalentFullscreenProvider({ children }: { children: ReactNode }) {
  // Server snapshot false — hydration-ийн эхний render-т prompt харуулахгүй.
  const supported = useSyncExternalStore(
    subscribeNever,
    () => document.fullscreenEnabled === true,
    () => false,
  );
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [exited, setExited] = useState(false);
  const enteredRef = useRef(false);
  const exitListenersRef = useRef(new Set<() => void>());

  useEffect(() => {
    const onChange = () => {
      const isFullscreen = document.fullscreenElement != null;
      if (!isFullscreen && enteredRef.current) {
        enteredRef.current = false;
        setExited(true);
        for (const listener of exitListenersRef.current) listener();
      } else if (isFullscreen && !enteredRef.current) {
        enteredRef.current = true;
        setExited(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(async () => {
    if (!document.fullscreenEnabled) return;
    try {
      await document.documentElement.requestFullscreen();
      enteredRef.current = true;
      setExited(false);
    } catch {
      // Browser/хэрэглэгч татгалзсан — дараагийн товч дээр дахин оролдоно.
    }
  }, []);

  const accept = useCallback(async () => {
    await enter();
    setPromptDismissed(true);
  }, [enter]);

  const ensure = useCallback(() => {
    if (!enteredRef.current) void enter();
  }, [enter]);

  const onExit = useCallback((listener: () => void) => {
    exitListenersRef.current.add(listener);
    return () => {
      exitListenersRef.current.delete(listener);
    };
  }, []);

  const promptOpen = supported && !promptDismissed;
  const value = useMemo(
    () => ({ blocking: promptOpen || exited, ensure, onExit }),
    [promptOpen, exited, ensure, onExit],
  );
  const overlay = useMemo(() => ({ promptOpen, exited, enter, accept }), [promptOpen, exited, enter, accept]);

  return (
    <TalentFullscreenContext.Provider value={value}>
      <TalentFullscreenOverlayContext.Provider value={overlay}>{children}</TalentFullscreenOverlayContext.Provider>
    </TalentFullscreenContext.Provider>
  );
}

export function useTalentFullscreen(): TalentFullscreenValue {
  const value = useContext(TalentFullscreenContext);
  if (!value) throw new Error("useTalentFullscreen must be used within TalentFullscreenProvider");
  return value;
}

/** Prompt болон exit overlay — урилга ачаалагдсан (алдаа/дууссан биш) дэлгэцүүдэд
 *  л render хийнэ (бодит frontend-тэй адил). */
export function TalentFullscreenOverlays() {
  const overlay = useContext(TalentFullscreenOverlayContext);
  if (!overlay) return null;

  if (overlay.promptOpen) {
    return (
      <FullscreenDialog
        title={TALENT_TEXT.fullscreenRequiredTitle}
        description={TALENT_TEXT.fullscreenRequiredDescription}
        button={TALENT_TEXT.fullscreenRequiredButton}
        onClick={overlay.accept}
      />
    );
  }
  if (overlay.exited) {
    return (
      <FullscreenDialog
        title={TALENT_TEXT.fullscreenTitle}
        titleClassName="text-red-600"
        description={TALENT_TEXT.fullscreenDescription}
        button={TALENT_TEXT.fullscreenButton}
        onClick={overlay.enter}
      />
    );
  }
  return null;
}

function FullscreenDialog({
  title,
  titleClassName = "text-[#10182B]",
  description,
  button,
  onClick,
}: {
  title: string;
  titleClassName?: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreenTitle"
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-5 ${manrope.className}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-white p-6 text-center">
        <h2 id="fullscreenTitle" className={`text-lg font-semibold ${titleClassName}`}>
          {title}
        </h2>
        <p className="text-sm text-[#637389]">{description}</p>
        <TalentPrimaryButton onClick={onClick}>{button}</TalentPrimaryButton>
      </div>
    </div>
  );
}

function subscribeNever() {
  return () => {};
}
