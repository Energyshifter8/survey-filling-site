"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { mockSurvey } from "@/lib/mock-survey";

export default function QuestionsPage() {
  const params = useParams();
  const code = params.code as string;
  const survey = mockSurvey;
  const questions = survey.questions;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const question = questions[currentStep];
  const progress = Math.round(((currentStep + 1) / questions.length) * 100);
  const isLast = currentStep === questions.length - 1;

  function handleSelect(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function handleNext() {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentStep((s) => s + 1);
  }

  const canProceed = answers[question.id] !== undefined;

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Баярлалаа!</h1>
          <p className="text-gray-500 mb-8">
            Таны хариултууд амжилттай хадгалагдлаа. Таны санал бидэнд маш их хэрэгтэй.
          </p>
          <Link
            href={`/s/${code}`}
            className="inline-block px-6 py-3 rounded-lg bg-[#7C86F0] text-white font-medium hover:bg-indigo-500 transition-colors"
          >
            Нүүр хуудас руу буцах
          </Link>
        </div>
        <div className="fixed bottom-4 left-4 z-40">
          <MindXLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top-right font toggle */}
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-20">
        <div className="max-w-[700px] w-full">
          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{survey.title}</h1>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C86F0] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">{progress}%</span>
          </div>

          {/* Question */}
          <div className="mb-8">
            <p className="text-lg font-semibold text-gray-900 mb-6">
              {currentStep + 1}. {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-[#7C86F0] bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {/* Radio circle */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        selected ? "border-[#7C86F0]" : "border-gray-300"
                      }`}
                    >
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#7C86F0]" />}
                    </div>
                    <span className="text-gray-700">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              className={`text-sm transition-colors ${
                currentStep === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              ← Өмнөх
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                canProceed
                  ? "bg-[#7C86F0] text-white hover:bg-indigo-500"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLast ? "Дуусгах" : "Үргэлжлүүлэх"}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom-left logo */}
      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>
    </div>
  );
}
