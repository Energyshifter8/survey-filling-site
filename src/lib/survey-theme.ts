// Судалгааны visual theme (background/товч/сонголтын өнгө).
//
// confirmed 2026-09-04: survey-staging.mindxplus.com (bodit reference)-ийн
// client JS bundle-аас (`_next/static/chunks/933-14f1ef0549756737.js`, webpack
// module id 62478, export `Z`) шууд уншиж авсан БҮРЭН THEME_MAP — 5 enum утга
// (SurveyThemeType-ийг үз, src/lib/api/types.ts) тус бүрд ~32 CSS-ий хувьсагч
// (background/text/option/input/star-rating/button/progress-bar) харгалзана.
// Reference-ийн frontend `design.themeType`-аар энэ map-аас өнгийг сонгоод,
// inline CSS custom property болгож DOM-д тараадаг (decompiled bundle,
// src/app/s/[shortUrl]/questions/page.tsx-ийн git history-г үз).
//
// Bodit шалгалтаар (2026-09-04) баталгаажсан:
//   - 111 асуулттай "Монгол хүний сайн сайхан байдлын цогц судалгаа"
//     (хөх дэвсгэр #4D6AA6, улбар шар товч #FF8A00) — яг YALE-тэй тэнцүү.
//   - Энэ codebase-ийн өмнөх hardcode хийсэн "periwinkle-blue" дефолт стиль
//     (bg #F5F7FF, text #10182B, товч #8CA9FF) — яг LIGHT-тэй ТЭНЦҮҮ, санамсаргүй
//     давхцал биш: LIGHT нь энэ reference site-ийн бодит дефолт theme учраас.
import type { CSSProperties } from "react";
import type { SurveyDesignDTO, SurveyThemeType } from "@/lib/api/types";

export interface SurveyThemeColors {
  bgColor: string;
  txtColor: string;
  optionBg: string;
  optionBgActive: string;
  optionBgHover: string;
  optionTxtColor: string;
  optionActiveTxtColor: string;
  optionBorder: string;
  optionActiveBorder: string;
  optionBorderHoverColor: string;
  radioColor: string;
  radioActiveColor: string;
  descColor: string;
  inputBg: string;
  inputBorder: string;
  inputBgFocus?: string;
  inputBorderFocus?: string;
  inputBgFilled?: string;
  inputBorderFilled?: string;
  starRateBorder: string;
  starRateBorderHover: string;
  starRateBorderActive: string;
  starRateActive: string;
  disabledColor: string;
  disabledBackground: string;
  disabledBorder: string;
  btnBg: string;
  btnTxt: string;
  backBtnBorder: string;
  backBtnTxt: string;
  progressBarActive: string;
  progressBarBg: string;
}

// confirmed 2026-09-04 (decompiled bundle, chunk 933, module 62478 export Z) —
// доорх 5 объект бүр бодит hex утгуудыг агуулна, ямар ч таамаг байхгүй.
export const SURVEY_THEME_MAP: Record<SurveyThemeType, SurveyThemeColors> = {
  YALE: {
    bgColor: "#4D6AA6",
    txtColor: "#FFFFFF",
    optionBgActive: "#4D6AA6",
    optionBg: "#4D6AA6",
    optionBgHover: "#4D6AA6",
    optionActiveTxtColor: "#FFFFFF",
    optionTxtColor: "#FFFFFF",
    optionBorder: "#D1D5DB",
    optionActiveBorder: "#FF8A00",
    optionBorderHoverColor: "#A3BAFF",
    radioColor: "#D1D5DB",
    radioActiveColor: "#FF8A00",
    descColor: "#92A3BB",
    inputBg: "transparent",
    inputBorder: "#FF8A00",
    inputBgFocus: "#7B737B",
    inputBorderFocus: "#FF8A00",
    inputBgFilled: "transparent",
    inputBorderFilled: "#FF8A00",
    starRateBorder: "#D1D5DB",
    starRateBorderHover: "#FF8A00",
    starRateBorderActive: "#FF8A00",
    starRateActive: "#FF8A00",
    disabledColor: "#92A3BB",
    disabledBackground: "#3A4E7A",
    disabledBorder: "#5E7EC3",
    btnBg: "#FF8A00",
    btnTxt: "#FFFFFF",
    backBtnBorder: "#92A3BB",
    backBtnTxt: "#92A3BB",
    progressBarActive: "#FF8A00",
    progressBarBg: "#3A4E7A",
  },
  DARK: {
    bgColor: "#111111",
    txtColor: "#9CA3AF",
    optionBgActive: "transparent",
    optionBg: "transparent",
    optionBgHover: "#1E192C",
    optionActiveTxtColor: "#9CA3AF",
    optionTxtColor: "#9CA3AF",
    optionActiveBorder: "#8050F1",
    optionBorder: "#E4E8EF",
    optionBorderHoverColor: "#8050F1",
    radioColor: "#CBD5E1",
    radioActiveColor: "#8050F1",
    descColor: "#CBD5E1",
    inputBg: "transparent",
    inputBorder: "#CBD5E1",
    inputBgFocus: "#1E192C",
    inputBorderFocus: "#8050F1",
    inputBgFilled: "transparent",
    inputBorderFilled: "#8050F1",
    starRateBorder: "#92A3BB",
    starRateBorderHover: "#9871F4",
    starRateBorderActive: "#9871F4",
    starRateActive: "#8050F1",
    disabledColor: "#92A3BB",
    disabledBackground: "#1E192C",
    disabledBorder: "#3D3D3D",
    btnBg: "#8050F1",
    btnTxt: "#111111",
    backBtnBorder: "#4B5563",
    backBtnTxt: "#9CA3AF",
    progressBarActive: "#8050F1",
    progressBarBg: "#1E192C",
  },
  MIRAGE: {
    bgColor: "#F6F7EB",
    txtColor: "#10182B",
    optionBgActive: "transparent",
    optionBg: "transparent",
    optionBgHover: "#EBEED4",
    optionActiveTxtColor: "#10182B",
    optionTxtColor: "#10182B",
    optionActiveBorder: "#809B00",
    optionBorder: "#E4E8EF",
    optionBorderHoverColor: "#809B00",
    radioColor: "#CBD5E1",
    radioActiveColor: "#809B00",
    descColor: "#92A3BB",
    inputBg: "transparent",
    inputBorder: "#CBD5E1",
    inputBgFocus: "#EBEED4",
    inputBorderFocus: "#8FAD00",
    inputBgFilled: "transparent",
    inputBorderFilled: "#809B00",
    starRateBorder: "#92A3BB",
    starRateBorderHover: "#8FAD00",
    starRateBorderActive: "#8FAD00",
    starRateActive: "#809B00",
    disabledColor: "#92A3BB",
    disabledBackground: "#E4E8EF",
    disabledBorder: "#CBD5E1",
    btnBg: "#809B00",
    btnTxt: "#FFFFFF",
    backBtnBorder: "#92A3BB",
    backBtnTxt: "#92A3BB",
    progressBarActive: "#809B00",
    progressBarBg: "#E4E8EF",
  },
  LIGHT: {
    bgColor: "#F5F7FF",
    txtColor: "#10182B",
    optionBgActive: "transparent",
    optionBg: "transparent",
    optionBgHover: "#F5F7FF",
    optionActiveTxtColor: "#10182B",
    optionTxtColor: "#10182B",
    optionActiveBorder: "#A3BAFF",
    optionBorder: "#E4E8EF",
    optionBorderHoverColor: "#8CA9FF",
    radioColor: "#CBD5E1",
    radioActiveColor: "#8CA9FF",
    descColor: "#92A3BB",
    inputBg: "transparent",
    inputBorder: "#CBD5E1",
    inputBgFocus: "#F5F7FF",
    inputBorderFocus: "#A3BAFF",
    inputBgFilled: "transparent",
    inputBorderFilled: "#7094FF",
    starRateBorder: "#92A3BB",
    starRateBorderHover: "#A3BAFF",
    starRateBorderActive: "#A3BAFF",
    starRateActive: "#8CA9FF",
    disabledColor: "#92A3BB",
    disabledBackground: "#E4E8EF",
    disabledBorder: "#CBD5E1",
    btnBg: "#8CA9FF",
    btnTxt: "#FFFFFF",
    backBtnBorder: "#92A3BB",
    backBtnTxt: "#92A3BB",
    progressBarActive: "#8CA9FF",
    progressBarBg: "#E4E8EF",
  },
  PURPLE: {
    bgColor: "#F5F7FF",
    txtColor: "#10182B",
    optionBgActive: "#F5F7FF",
    optionBg: "#FFFFFF",
    optionBgHover: "#A3BAFF",
    optionActiveTxtColor: "#10182B",
    optionTxtColor: "#10182B",
    optionActiveBorder: "#8CA9FF",
    optionBorder: "#E4E8EF",
    optionBorderHoverColor: "#7094FF",
    radioColor: "#CBD5E1",
    radioActiveColor: "#8CA9FF",
    descColor: "#637389",
    inputBg: "#F5F7FF",
    inputBorder: "#A3BAFF",
    inputBgFocus: "#F5F7FF",
    starRateBorder: "#E4E8EF",
    starRateBorderHover: "#7094FF",
    starRateBorderActive: "#8CA9FF",
    starRateActive: "#8CA9FF",
    disabledColor: "#92A3BB",
    disabledBackground: "#E4E8EF",
    disabledBorder: "#CBD5E1",
    btnBg: "#10182B",
    btnTxt: "#FFFFFF",
    backBtnBorder: "#92A3BB",
    backBtnTxt: "#92A3BB",
    progressBarActive: "#8CA9FF",
    progressBarBg: "#E4E8EF",
  },
};

// Энэ codebase-ийн өмнөх hardcode дефолт нь LIGHT theme-тэй яг таарч байгаа тул
// (дээрх comment-ийг үз) "design/themeType алга" fallback-аар яг LIGHT-ийг сонгов —
// шинэ таамаг биш, зөвхөн өмнө нь Tailwind class-аар шууд бичсэн байсныг нэг
// төвлөрсөн эх сурвалж руу зөөсөн хэрэг.
export const DEFAULT_SURVEY_THEME: SurveyThemeColors = SURVEY_THEME_MAP.LIGHT;

/** survey.design-ээс theme-ийн өнгийг тодорхойлно. design/themeType байхгүй
 *  эсвэл map-д ороогүй утгатай бол LIGHT (=өмнөх periwinkle-blue дефолт) руу
 *  fallback хийнэ. */
export function resolveSurveyTheme(design: SurveyDesignDTO | null | undefined): SurveyThemeColors {
  const themeType = design?.themeType;
  if (themeType && themeType in SURVEY_THEME_MAP) return SURVEY_THEME_MAP[themeType];
  return DEFAULT_SURVEY_THEME;
}

// CSS custom property-үүдийн нэрс — компонентууд эдгээрийг Tailwind arbitrary
// value байдлаар (`bg-[var(--survey-bg)]` гэх мэт) ашиглана. Reference site
// нь `--bg-color`/`--option-bg` гэх мэт нэртэй байсан ч энэ codebase даяар
// давхцахгүй байхын тулд `--survey-` угтвартай нэрлэв (шинэ нэршил, reference-ийн
// яг тэр нэрс биш — зөвхөн ХЭРЭГЛЭЭ ижил).
export interface SurveyThemeCssVars extends CSSProperties {
  "--survey-bg": string;
  "--survey-text": string;
  "--survey-desc": string;
  "--survey-option-bg": string;
  "--survey-option-bg-active": string;
  "--survey-option-bg-hover": string;
  "--survey-option-text": string;
  "--survey-option-text-active": string;
  "--survey-option-border": string;
  "--survey-option-border-active": string;
  "--survey-option-border-hover": string;
  "--survey-radio": string;
  "--survey-radio-active": string;
  "--survey-star-border": string;
  "--survey-star-border-hover": string;
  "--survey-star-border-active": string;
  "--survey-star-active": string;
  "--survey-btn-bg": string;
  "--survey-btn-text": string;
  "--survey-btn-disabled-bg": string;
  "--survey-btn-disabled-text": string;
  "--survey-back-btn-border": string;
  "--survey-back-btn-text": string;
  "--survey-progress-active": string;
  "--survey-progress-bg": string;
}

/** `theme`-ийг wrapper элемент дээр `style={...}`-ээр тавих CSS custom
 *  property объект болгож хөрвүүлнэ. */
export function surveyThemeCssVars(theme: SurveyThemeColors): SurveyThemeCssVars {
  return {
    "--survey-bg": theme.bgColor,
    "--survey-text": theme.txtColor,
    "--survey-desc": theme.descColor,
    "--survey-option-bg": theme.optionBg,
    "--survey-option-bg-active": theme.optionBgActive,
    "--survey-option-bg-hover": theme.optionBgHover,
    "--survey-option-text": theme.optionTxtColor,
    "--survey-option-text-active": theme.optionActiveTxtColor,
    "--survey-option-border": theme.optionBorder,
    "--survey-option-border-active": theme.optionActiveBorder,
    "--survey-option-border-hover": theme.optionBorderHoverColor,
    "--survey-radio": theme.radioColor,
    "--survey-radio-active": theme.radioActiveColor,
    "--survey-star-border": theme.starRateBorder,
    "--survey-star-border-hover": theme.starRateBorderHover,
    "--survey-star-border-active": theme.starRateBorderActive,
    "--survey-star-active": theme.starRateActive,
    "--survey-btn-bg": theme.btnBg,
    "--survey-btn-text": theme.btnTxt,
    "--survey-btn-disabled-bg": theme.disabledBackground,
    "--survey-btn-disabled-text": theme.disabledColor,
    "--survey-back-btn-border": theme.backBtnBorder,
    "--survey-back-btn-text": theme.backBtnTxt,
    "--survey-progress-active": theme.progressBarActive,
    "--survey-progress-bg": theme.progressBarBg,
  };
}
