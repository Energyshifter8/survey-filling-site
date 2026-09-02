"use client";

// Reference (survey-staging.mindxplus.com) дээрх "A A A" сэлгүүрийг тулгаж
// сайжруулсан: 3 тогтмол хэмжээтэй ("A" 12/18/24px) товч, дарахад level (0-2)
// сонгогдоно. Client-side state л ашигладаг — ямар ч backend дуудлага
// шаардлагагүй (Network tab-аар шалгасан: level солиход шинэ хүсэлт явдаггүй,
// localStorage/cookie-д ч хадгалдаггүй тул reload хийхэд анхны хэмжээндээ
// буцдаг — бид ч мөн адил зөвхөн in-memory state ашигласан).
export type FontSizeLevel = 0 | 1 | 2;

const SIZES: { level: FontSizeLevel; px: number }[] = [
  { level: 0, px: 12 },
  { level: 1, px: 18 },
  { level: 2, px: 24 },
];

interface FontSizeToggleProps {
  level: FontSizeLevel;
  onChange: (level: FontSizeLevel) => void;
}

export default function FontSizeToggle({ level, onChange }: FontSizeToggleProps) {
  return (
    <div className="flex items-center justify-end gap-x-2">
      {SIZES.map((s) => (
        <button
          key={s.level}
          type="button"
          aria-label={`Фонт хэмжээ ${s.level + 1}`}
          aria-pressed={level === s.level}
          onClick={() => onChange(s.level)}
          style={{ fontSize: `${s.px}px`, lineHeight: `${s.px}px` }}
          className={`flex size-9 cursor-pointer items-center justify-center rounded-xl font-medium hover:bg-[#F5F5F5] ${
            level === s.level ? "bg-[#F5F7FF] text-[#10182B]" : "text-[#637389]"
          }`}
        >
          A
        </button>
      ))}
    </div>
  );
}

/** Толгойн текстэд ашиглах Tailwind хэмжээ (level бүрд бодит reference-ээс
 *  шууд уншсан класс) — reference-ийн H1-ийг toggle дарж инспект хийхэд яг
 *  эдгээр 3 багц гарч ирсэн. */
export const HEADING_SIZE_CLASSES: Record<FontSizeLevel, string> = {
  0: "text-3xl sm:text-4xl md:text-5xl",
  1: "text-4xl sm:text-5xl md:text-6xl",
  2: "text-5xl sm:text-6xl md:text-7xl",
};

/** Бусад текст (тайлбар, мета мөр гэх мэт)-ийн хэмжээ — H1-ийн адил
 *  пропорцоор нэмэгдүүлсэн, гэхдээ эдгээр тодорхой элементүүдийг reference
 *  дээр тус тусад нь баталгаажуулаагүй тул ойролцоо утга. */
export const BODY_SIZE_CLASSES: Record<FontSizeLevel, string> = {
  0: "text-base",
  1: "text-lg",
  2: "text-xl",
};

export const META_SIZE_CLASSES: Record<FontSizeLevel, string> = {
  0: "text-sm",
  1: "text-base",
  2: "text-lg",
};
