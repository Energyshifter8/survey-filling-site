"use client";

import { Button } from "@/components/ui/button";
import { useFontSize } from "./FontSizer";

const sizes = [
  { key: "sm" as const, label: "A", className: "text-xs" },
  { key: "md" as const, label: "A", className: "text-base" },
  { key: "lg" as const, label: "A", className: "text-xl" },
];

export default function FontSizeToggle() {
  const { size, setSize } = useFontSize();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-card px-2 py-1 shadow-sm ring-1 ring-border">
      {sizes.map((s) => (
        <Button
          key={s.key}
          variant={size === s.key ? "secondary" : "ghost"}
          size="icon-sm"
          className={s.className}
          onClick={() => setSize(s.key)}
          aria-label={`Font size ${s.key}`}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
