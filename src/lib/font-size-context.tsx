"use client";

// Фонт хэмжээний сонголтыг БҮХ судалгааны хуудсанд (intro/consent/questions/end)
// хуваалцах React Context. src/components/FontSizeToggle.tsx-ийн харах/дарах
// UI үүнийг ашиглана; state өөрөө энд нэг л газар удирдагдана (root layout-д
// нэг л удаа <FontSizeProvider> тавьснаар доtorh бүх page дундаа хуваалцана —
// page бүрдээ useState давхардуулах шаардлагагүй болно).
//
// АНХААР (2026-09-04, browser tool-оор reference — survey-staging.mindxplus.com —
// дээр шууд баталгаажуулсан): бодит reference сайт localStorage/cookie-д ЭНЭ
// сонголтыг ХАДГАЛДАГГҮЙ (click хийхэд ямар ч Storage бичигдэхгүй, full page
// reload хийхэд үргэлж анхны/жижиг хэмжээ рүү буцдаг) — зөвхөн тухайн route-ийн
// client-side navigation (intro -> consent -> questions, page reload БИШ)
// дундуур л хадгалагдана. Гэхдээ энэ project-ийн даалгаврын дагуу бид ЗОРИУДААР
// үүнээс цаашид сайжруулж, бодит хэрэглэгчийн ерөнхий тохиргоо болгож
// localStorage-д хадгалж, page reload/шинэ tab хооронд ч хадгалагдахаар
// хийсэн болно (доорхыг үз) — энэ нь reference-тэй санамсаргүй зөрөх зүйл БИШ,
// сая нэмж өгсөн тодорхой сайжруулалт.
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

// Эх сурвалж энд — FontSizeToggle.tsx (болон бусад хэрэглэгч бүх component)
// эндээс дахин экспортлохын оронд шууд импортолно (эргэлдсэн импорт
// (circular import) үүсгэхгүйн тулд).
export type FontSizeLevel = 0 | 1 | 2;

// survey_session_*/survey_progress_* (src/lib/survey-session.ts) нь shortUrl
// тус бүрээр тусдаа, sessionStorage-д (tab хаагдмагц устдаг) хадгалагддаг —
// энэ бол огт ондоо зорилготой тул ТУСДАА түлхүүр, ТУСДАА Storage сонгосон:
// фонтын хэмжээ бол судалгаа бүрт биш, бүх сайтад НЭГ удаа хадгалагдах
// хэрэглэгчийн ерөнхий тохиргоо тул localStorage (browser хаагдсаны дараа ч
// хадгалагдана).
const STORAGE_KEY = "font_size_pref";
const DEFAULT_LEVEL: FontSizeLevel = 0;

function isFontSizeLevel(value: unknown): value is FontSizeLevel {
  return value === 0 || value === 1 || value === 2;
}

function safeLoadLevel(): FontSizeLevel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return isFontSizeLevel(parsed) ? parsed : null;
  } catch {
    return null; // private mode/storage disabled — анхны хэмжээгээр л ажиллана
  }
}

function safeSaveLevel(level: FontSizeLevel) {
  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // хадгалж чадаагүй ч UI-д нөлөөлөхгүй — зөвхөн дараагийн reload дээр л
    // сонголт хадгалагдаагүй байх тул чимээгүй унана
  }
}

interface FontSizeContextValue {
  level: FontSizeLevel;
  setLevel: (level: FontSizeLevel) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  // АНХААР (hydration): localStorage-ыг lazy useState initializer дотор шууд
  // уншиж болохгүй — сервер дээр (window байхгүй) анхны утга үргэлж 0 гардаг
  // ч client дээр (өмнө нь сонголт хийсэн бол) шууд өөр утга буцаах тул
  // server/client-ийн эхний render зөрж "Hydration failed" алдаа шидэх эрсдэлтэй
  // (src/lib/use-survey.ts-ийн useSurveyMeta-тай яг ижил зарчим). Тиймээс
  // DEFAULT_LEVEL-ээр эхлээд, mount болсны ДАРАА (client-only useEffect) л
  // localStorage-аас уншина.
  const [level, setLevelState] = useState<FontSizeLevel>(DEFAULT_LEVEL);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = safeLoadLevel();
    if (saved !== null) setLevelState(saved);
  }, []);

  function setLevel(next: FontSizeLevel) {
    setLevelState(next);
    safeSaveLevel(next);
  }

  return <FontSizeContext.Provider value={{ level, setLevel }}>{children}</FontSizeContext.Provider>;
}

/** src/app/s/[shortUrl]/layout.tsx-д тавьсан <FontSizeProvider>-ийн дотор
 *  байгаа ямар ч component-оос дуудна (жишээ: FontSizeToggle өөрөө, эсвэл
 *  текстээ level-ээр rem/tailwind class-аар өсгөх хүссэн ямар ч page/component). */
export function useFontSize(): FontSizeContextValue {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    throw new Error("useFontSize нь <FontSizeProvider> дотор л дуудагдах ёстой");
  }
  return ctx;
}
