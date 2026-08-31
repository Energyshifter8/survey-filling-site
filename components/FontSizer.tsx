"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type FontSize = "sm" | "md" | "lg";

const FontSizeContext = createContext<{
  size: FontSize;
  setSize: (s: FontSize) => void;
}>({ size: "md", setSize: () => {} });

export function useFontSize() {
  return useContext(FontSizeContext);
}

const sizeMap: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "20px",
};

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<FontSize>("md");

  return (
    <FontSizeContext.Provider value={{ size, setSize }}>
      <div style={{ fontSize: sizeMap[size] }}>{children}</div>
    </FontSizeContext.Provider>
  );
}
