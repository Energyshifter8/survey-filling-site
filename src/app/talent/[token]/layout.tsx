import FontSizeToggle from "@/components/FontSizeToggle";
import { FontSizeProvider } from "@/lib/font-size-context";

// Талент үнэлгээний (нүүр — page.tsx, тест — test/page.tsx) нийтлэг layout.
// Зам нь бодит frontend-тэй ижил (`/talent/{token}` — survey-staging.mindxplus.com
// дээр 2026-10-27-нд шалгасан), тиймээс backend-ийн илгээдэг урилгын имэйлийн
// линк зөвхөн host-оо солиход л энэ app дээр ажиллана. Фонт хэмжээний toggle
// survey-ийн layout-тай (src/app/s/[shortUrl]/layout.tsx) ижил.
export default function TalentLayout({ children }: LayoutProps<"/talent/[token]">) {
  return (
    <FontSizeProvider>
      <div className="fixed top-3 right-4 z-50 md:top-5 md:right-7.5">
        <FontSizeToggle />
      </div>
      {children}
    </FontSizeProvider>
  );
}
