"use client";

import { useState } from "react";
import { CONSENT_BASE_CLAUSES, CONSENT_DETAIL_SECTIONS } from "@/lib/consent-content";

// Бодит reference (survey-staging.mindxplus.com) дээрхтэй тулгаж сайжруулсан:
// - checkbox мөр дарахад л нээгддэг (Цааш товч дарахад биш)
// - "Татгалзах" зүгээр л modal-ыг хаана, ямар ч state өөрчлөхгүй
// - "Зөвшөөрөх" modal-ыг хааж, зөвшөөрлийг тэмдэглэнэ (шууд Цааш руу шилждэггүй)
interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function ConsentModal({ open, onClose, onAccept }: ConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is a pointer-only dismiss target, Escape/tab focus stay on the dialog itself.
    // biome-ignore lint/a11y/noStaticElementInteractions: same backdrop dismiss target as above.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick only stops the backdrop's dismiss-click from bubbling — it triggers no action of its own, so it needs no keyboard equivalent. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[600px] flex-col gap-0 rounded-2xl bg-white p-0 shadow-[0px_10px_15px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <div className="flex w-full shrink-0 items-center justify-between px-6 py-4">
          <p id="consent-modal-title" className="text-[20px] font-semibold leading-6 text-[#10182B]">
            Зөвшөөрөл өгөх
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg p-1 text-[#10182B] hover:bg-[#F5F7FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
          >
            ✕
          </button>
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-[14px] font-medium text-[#10182B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              Татгалзах
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-lg bg-[#8CA9FF] px-4 py-2 text-[14px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              Зөвшөөрөх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
