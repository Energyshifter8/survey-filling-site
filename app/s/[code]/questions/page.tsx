"use client";

import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress, ProgressValue } from "@/components/ui/progress";
import { useSurvey } from "@/lib/use-survey";

export default function QuestionsPage() {
  const params = useParams();
  const code = params.code as string;

  const { data: survey } = useSurvey(code);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  if (!survey) return null;

  const questions = survey.questions;
  const question = questions[currentStep];
  const progress = Math.round(((currentStep + 1) / questions.length) * 100);
  const isLast = currentStep === questions.length - 1;
  const canProceed = answers[question.id] !== undefined;

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

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-8 text-green-500" />
          </div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Баярлалаа!</h1>
          <p className="text-muted-foreground">
            Таны хариултууд амжилттай хадгалагдлаа. Таны санал бидэнд маш их хэрэгтэй.
          </p>
          <Button render={<Link href={`/s/${code}`} />}>Нүүр хуудас руу буцах</Button>
        </Card>
        <div className="fixed bottom-4 left-4 z-40">
          <MindXLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center px-4 py-20">
        <div className="max-w-[700px] w-full space-y-10">
          <h1 className="font-heading text-2xl font-semibold text-foreground text-center tracking-tight">
            {survey.title}
          </h1>

          <div className="space-y-2">
            <Progress value={progress}>
              <ProgressValue />
            </Progress>
          </div>

          <Card className="p-6 space-y-6">
            <p className="text-lg font-medium text-foreground text-wrap-balance leading-relaxed">
              {currentStep + 1}. {question.text}
              {question.required && (
                <Badge variant="destructive" className="ml-2 align-middle">
                  *
                </Badge>
              )}
            </p>

            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        selected ? "border-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {selected && <div className="size-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-foreground">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" />
              Өмнөх
            </Button>
            <Button size="lg" disabled={!canProceed} onClick={handleNext}>
              {isLast ? "Дуусгах" : "Үргэлжлүүлэх"}
              {!isLast && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>
    </div>
  );
}
