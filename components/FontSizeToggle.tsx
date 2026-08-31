"use client";

import { useFontSize } from "./FontSizer";

const sizes = [
  { key: "sm" as const, label: "A", className: "text-xs" },
  { key: "md" as const, label: "A", className: "text-base" },
  { key: "lg" as const, label: "A", className: "text-xl" },
];

export default function FontSizeToggle() {
  const { size, setSize } = useFontSize();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 shadow-sm border border-gray-100">
      {sizes.map((s) => (
        <button
          key={s.key}
          onClick={() => setSize(s.key)}
          className={`${s.className} font-bold rounded px-2 py-0.5 transition-colors ${
            size === s.key ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label={`Font size ${s.key}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
