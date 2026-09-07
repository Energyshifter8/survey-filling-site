"use client";

import { type ChangeEvent, type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import { useFontSize } from "@/lib/font-size-context";

export interface PasscodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  id?: string;
}

const CELL_FONT_SIZE: Record<0 | 1 | 2, number> = { 0: 28, 1: 34, 2: 40 };

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 13.3327V10.666C8 6.25268 9.33333 2.66602 16 2.66602C22.6667 2.66602 24 6.25268 24 10.666V13.3327"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.9974 24.6667C17.8383 24.6667 19.3307 23.1743 19.3307 21.3333C19.3307 19.4924 17.8383 18 15.9974 18C14.1564 18 12.6641 19.4924 12.6641 21.3333C12.6641 23.1743 14.1564 24.6667 15.9974 24.6667Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.6641 29.334H9.33073C3.9974 29.334 2.66406 28.0007 2.66406 22.6673V20.0007C2.66406 14.6673 3.9974 13.334 9.33073 13.334H22.6641C27.9974 13.334 29.3307 14.6673 29.3307 20.0007V22.6673C29.3307 28.0007 27.9974 29.334 22.6641 29.334Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PasscodeInput({
  value,
  onChange,
  onSubmit,
  length = 6,
  error = false,
  disabled = false,
  id = "passCode",
}: PasscodeInputProps) {
  const { level } = useFontSize();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const errorId = `${id}-error`;

  function setCell(index: number, char: string) {
    const next = cells.slice();
    next[index] = char;
    onChange(next.join(""));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>, index: number) {
    const char = e.target.value;
    if (!/^\d?$/.test(char)) return;
    setCell(index, char);
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace" && !cells[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && cells.every((c) => c !== "")) {
      onSubmit?.();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text/plain").replace(/\D/g, "");
    if (digits.length < length) return;
    onChange(digits.slice(0, length));
    inputsRef.current[length - 1]?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LockIcon className="text-[var(--survey-text)]" />
      <fieldset aria-describedby={error ? errorId : undefined} className="m-0 contents border-0 p-0">
        <legend className="sr-only">Нэвтрэх код</legend>
        <div className="flex justify-center gap-2">
          {cells.map((char, i) => (
            <input
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length PIN cells — байрлал өөрөө identity
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              id={`${id}-${i}`}
              type="password"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={1}
              value={char}
              disabled={disabled}
              aria-invalid={error}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={handlePaste}
              style={{ fontSize: CELL_FONT_SIZE[level] }}
              className={`h-[60px] w-[50px] rounded-lg border text-center font-medium text-[var(--survey-text)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                error
                  ? "border-red-500 bg-[var(--survey-input-bg)] shadow-[0_0_0_2px_rgba(239,68,68,0.15)]"
                  : char
                    ? "border-[var(--survey-input-border-filled)] bg-[var(--survey-input-bg-filled)]"
                    : "border-[var(--survey-input-border)] bg-[var(--survey-input-bg)] focus-visible:border-[var(--survey-input-border-focus)] focus-visible:bg-[var(--survey-input-bg-focus)] focus-visible:ring-2 focus-visible:ring-[var(--survey-input-border-focus)]/40"
              }`}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
