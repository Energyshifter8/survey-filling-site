"use client";

import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CONSENT_BASE_CLAUSES, CONSENT_DETAIL_SECTIONS } from "@/lib/consent-content";
import { manrope } from "@/lib/fonts";

// Бодит reference (survey-staging.mindxplus.com) дээрхтэй тулгаж сайжруулсан:
// - checkbox мөр дарахад л нээгддэг (Цааш товч дарахад биш)
// - "Татгалзах" зүгээр л modal-ыг хаана, ямар ч state өөрчлөхгүй
// - "Зөвшөөрөх" modal-ыг хааж, зөвшөөрлийг тэмдэглэнэ (шууд Цааш руу шилждэггүй)
//
// Dialog/DialogClose нь @/components/ui/dialog (shadcn, Base UI) — focus trap,
// Escape-ээр хаах, aria-labelledby зэргийг өөрөө хийдэг тул урьд нь эндээс
// гараар бичсэн role/aria-modal/backdrop stopPropagation/biome-ignore-үүд
// шаардлагагүй болсон. Visual нь өмнөхтэй яг адилхан — зөвхөн className-аар
// override хийсэн.
//
// Анхаар: Dialog нь агуулгаа Portal-оор document.body руу гаргадаг тул энэ
// компонент цаашид `<main className={manrope.className}>`-ийн дотор дүрслэгдэж
// байсан ч гэсэн тэрхүү эцэг элементээсээ фонтоо inherit хийхээ больсон
// (Portal хийгдэхээс өмнө нэг DOM мод дотор байсан тул анхаарагдаагүй асуудал —
// Manrope-ийн оронд browser-ийн default sans-serif руу унасан, тухайлбар
// font-semibold-ийн жин өөр харагдаж байсан). Тиймээс DialogContent дээр
// manrope.className-г шууд өгч байна.
interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function ConsentModal({ open, onClose, onAccept }: ConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none"
        className={`top-1/2 left-1/2 flex w-full max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 rounded-2xl bg-white p-0 shadow-[0px_10px_15px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.1)] sm:max-w-[600px] ${manrope.className}`}
      >
        <div className="flex w-full shrink-0 items-center justify-between px-6 py-4">
          <DialogTitle className="text-[20px] font-semibold leading-6 text-[#10182B]">Зөвшөөрөл өгөх</DialogTitle>
          <DialogDescription className="sr-only">
            Судалгаанд оролцохын өмнө зөвшөөрлийн нөхцлүүдтэй танилцана уу.
          </DialogDescription>
          <DialogClose
            aria-label="Хаах"
            className="rounded-lg p-1 text-[#10182B] hover:bg-[#F5F7FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
          >
            ✕
          </DialogClose>
        </div>

        <div
          className={`flex w-full shrink-0 flex-col gap-4 overflow-y-auto px-6 tracking-[0.2px] ${expanded ? "h-[500px]" : "h-[284px]"}`}
        >
          {CONSENT_BASE_CLAUSES.map((clause, i) => (
            <ol key={clause.text} className="block w-full shrink-0 list-decimal" start={i + 1}>
              <li className="ms-[21px] text-[14px] font-medium leading-[1.4] text-[#637389]">
                {clause.text}
                {clause.suffix && (
                  <>
                    <a
                      href={clause.suffix.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {clause.suffix.label}
                    </a>
                    {clause.suffix.after}
                  </>
                )}
              </li>
            </ol>
          ))}

          {expanded && (
            <>
              <p className="w-full shrink-0 text-center text-[16px] font-medium leading-5 tracking-[0.2px] text-[#10182B]">
                ДЭЛГЭРЭНГҮЙ
              </p>
              {CONSENT_DETAIL_SECTIONS.map((section) => (
                <div key={section.heading} className="flex w-full shrink-0 flex-col gap-4">
                  <p className="text-center text-[14px] font-semibold leading-[1.4] tracking-[0.2px] text-[#10182B]">
                    {section.heading}
                  </p>
                  {section.items.map((item, i) => (
                    <ol key={item.text} className="block w-full list-decimal" start={i + 1}>
                      <li className="ms-[21px] text-[14px] font-medium leading-[1.4] text-[#637389]">
                        {item.text}
                        {item.link && (
                          <a
                            href={item.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {item.link.label}
                          </a>
                        )}
                      </li>
                    </ol>
                  ))}
                  {section.note && (
                    <p className="w-full text-[14px] font-medium leading-[1.4] tracking-[0.2px] text-[#637389]">
                      {section.note}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-2 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-[14px] font-medium leading-[1.4] tracking-[0.2px] text-[#637389] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
          >
            {expanded ? "Хураах ▲" : "Дэлгэрэнгүй ▼"}
          </button>
          <div className="flex items-center gap-4">
            <DialogClose className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-[14px] font-medium text-[#10182B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]">
              Татгалзах
            </DialogClose>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-lg bg-[#8CA9FF] px-4 py-2 text-[14px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              Зөвшөөрөх
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
