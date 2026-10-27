import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { manrope } from "@/lib/fonts";
import { TALENT_TEXT } from "@/lib/helptext";

// Талент үнэлгээний (/talent/[token] ба /talent/[token]/test) хуудсуудын
// хуваалцдаг энгийн хэсгүүд. Карт нь бодит frontend-тэй адил theme-ээс үл
// хамааран цагаан дэвсгэр + бараан текст; харин хуудасны дэвсгэр
// (`--survey-bg`) болон товчны өнгө (`--survey-btn-*`) design.themeType-аас ирнэ.

export function TalentStatusScreen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center bg-[var(--survey-bg,#F5F7FF)] px-4 py-16 ${manrope.className}`}
      style={style}
    >
      <div className="max-w-120 text-center leading-relaxed text-[var(--survey-desc,#637389)]">{children}</div>
    </main>
  );
}

export function TalentCompletedScreen({ style }: { style?: CSSProperties }) {
  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center gap-4 bg-[#F5F7FF] px-4 py-16 text-center ${manrope.className}`}
      style={style}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-16">
        <circle cx="24" cy="24" r="24" fill="#7094FF" opacity="0.85" />
        <path d="M14 24.5l7 7 13-14" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="text-2xl font-semibold leading-snug text-[#10182B] sm:text-3xl md:text-[40px]">
        {TALENT_TEXT.completedTitle}
      </h1>
      <p className="max-w-120 text-base text-[#637389]">{TALENT_TEXT.completedDescription}</p>
    </main>
  );
}

export function TalentCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`w-full rounded-lg bg-white p-5 shadow-[0px_4px_16px_0px_#C4CBE833] sm:rounded-2xl sm:p-10 ${className}`}
    >
      {children}
    </div>
  );
}

export function TalentPrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg bg-[var(--survey-btn-bg,#8CA9FF)] px-6 py-3 text-[15px] font-medium text-[var(--survey-btn-text,#FFFFFF)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-btn-bg,#8CA9FF)] ${className}`}
    />
  );
}

export function TalentSecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border border-[var(--survey-back-btn-border,#CBD5E1)] px-6 py-3 text-[15px] font-medium text-[var(--survey-back-btn-text,#10182B)] transition-colors hover:bg-[var(--survey-option-bg-hover,#F5F7FF)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--survey-back-btn-border,#CBD5E1)] ${className}`}
    />
  );
}
