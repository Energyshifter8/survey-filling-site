"use client";

import { useState } from "react";

const consentClauses = [
  "Энэхүү судалгаанд оролцох нь таны сайн дурын үйлдэл бөгөөд та хэзээ ч судалгаагаа цуцлах эрхтэй.",
  "Таны өгсөн хариултууд нууцлалтай хадгалагдах бөгөөд гуравдагч этгээдэд дамжуулагдахгүй.",
  "Судалгааны явцад таны нэр, хаяг, утасны дугар зэрэг хувийн мэдээлэл асуугдахгүй.",
  "Судалгааны үр дүн нийтээрээ (хувь хүний мэдээлэлгүйгээр) шинжилгээнд ашиглагдана.",
  "Судалгаагаа дуусгасны дараа та үр дүнгийн хураангуйг имэйлээр хүлээн авах боломжтой.",
];

interface ConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ onAccept, onDecline }: ConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Зөвшөөрөл өгөх</h2>
          <button
            onClick={onDecline}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <ol className="space-y-3">
            {(expanded ? consentClauses : consentClauses.slice(0, 3)).map(
              (clause, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{clause}</span>
                </li>
              )
            )}
          </ol>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-3 text-sm text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
            >
              Дэлгэрэнгүй
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onDecline}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Татгалзах
          </button>
          <button
            onClick={onAccept}
            className="px-5 py-2.5 rounded-lg bg-[#7C86F0] text-white hover:bg-indigo-500 transition-colors text-sm font-medium"
          >
            Зөвшөөрөх
          </button>
        </div>
      </div>
    </div>
  );
}
