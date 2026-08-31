"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsentModal from "@/components/ConsentModal";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { mockSurvey } from "@/lib/mock-survey";

export default function TipPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const survey = mockSurvey;

  const [consentGiven, setConsentGiven] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top-right font toggle */}
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-[700px] w-full text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-8">
            {survey.title}
          </h1>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-gray-600">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">{survey.questionCount} асуулт</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                {survey.estimatedMinutes.min}-{survey.estimatedMinutes.max} минут
              </span>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-gray-500 text-base leading-relaxed mb-8 text-left">
            Энэхүү судалгаанд хариулахдаа тухайн асуултын хариултуудаас өөрийн хамгийн тохирохыг
            нэгийг нь сонгоно уу. Зарим асуултууд заавал хариулах шаардлагатай байж болох тул
            анхаарна уу.
          </p>

          {/* Consent checkbox row */}
          <label className="flex items-start gap-3 cursor-pointer text-left mb-8 group">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={() => {
                if (!consentGiven) setShowModal(true);
              }}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-[#7C86F0] cursor-pointer flex-shrink-0"
            />
            <span
              className="text-sm text-gray-600 leading-relaxed"
              onClick={() => {
                if (!consentGiven) setShowModal(true);
              }}
            >
              Зөвшөөрлийн хуудастай танилцсан болно.
            </span>
          </label>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <Link
              href={`/s/${code}`}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Буцах
            </Link>
            <button
              disabled={!consentGiven}
              onClick={() => router.push(`/s/${code}/questions`)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                consentGiven
                  ? "bg-[#7C86F0] text-white hover:bg-indigo-500"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Цааш
            </button>
          </div>
        </div>
      </main>

      {/* Bottom-left logo */}
      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>

      {/* Consent modal */}
      {showModal && (
        <ConsentModal
          onAccept={() => {
            setConsentGiven(true);
            setShowModal(false);
          }}
          onDecline={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
