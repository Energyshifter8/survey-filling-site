import FontSizeToggle from "@/components/FontSizeToggle";
import { FontSizeProvider } from "@/lib/font-size-context";

// Судалгааны БҮХ дэд page-үүдийн (intro/consent — page.tsx, questions/page.tsx,
// end/page.tsx) нийтлэг layout. Фонт хэмжээний "A A A" toggle-ийг ЭНД нэг л
// удаа тавьснаар (page бүрд давхардуулахгүй) бүх дэд route дээр автоматаар
// харагдана, мөн <FontSizeProvider>-ийн ачаар сонголт page хооронд (intro ->
// consent -> questions -> end) хуваалцагдана (localStorage-д ч хадгалагдана —
// @/lib/font-size-context-ийг үз).
//
// Байрлал: reference (survey-staging.mindxplus.com) дээрхтэй адил баруун
// дээд буланд, `fixed`-ээр (page бүрийн дотоод layout/scroll-оос үл хамааран
// тогтмол байрлалтай байхын тулд) — доорхи page-үүдийн `<main>`-ий
// px-4 py-3 md:px-7.5 md:py-5 spacing-тай тааруулав.
export default function SurveyLayout({ children }: LayoutProps<"/s/[shortUrl]">) {
  return (
    <FontSizeProvider>
      <div className="fixed top-3 right-4 z-50 md:top-5 md:right-7.5">
        <FontSizeToggle />
      </div>
      {children}
    </FontSizeProvider>
  );
}
