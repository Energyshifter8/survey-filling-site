"use client";

import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress, ProgressValue } from "@/components/ui/progress";
import type { AnswerChoice, QuestionWithRule } from "@/lib/api/types";
import { useSurveyMeta, useSurveyQuestions } from "@/lib/use-survey";

// Local answer state, keyed by question id. `optionId` covers SINGLE_CHOICE (the only type
// with a real input so far); other question types are stubbed - see the TODO below.
type LocalAnswer = { optionId?: number };

export default function QuestionsPage() {
  const params = useParams();
  const code = params.code as string;

  const { meta } = useSurveyMeta(code);
  const { questions, loading, error, submit } = useSurveyQuestions(code);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questionStartedAt = useRef(Date.now());
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentStep intentionally re-triggers this to reset the per-question timer.
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [currentStep]);

  if (loading) return null;

  if (error) {
    const message =
      error === "NO_SESSION"
        ? "Судалгаанд орох холбоос дуусгавар болжээ. Дахин эхлүүлнэ үү."
        : error;
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <p className="text-muted-foreground">{message}</p>
          <Button nativeButton={false} render={<Link href={`/s/${code}/tip`} />}>
            Буцах
          </Button>
        </Card>
      </main>
    );
  }

  if (!questions || questions.length === 0) return null;

  const question = questions[currentStep];
  const progress = Math.round(((currentStep + 1) / questions.length) * 100);
  const isLast = currentStep === questions.length - 1;
  const isSingleChoice = question.questionType === "SINGLE_CHOICE";
  const canProceed = isSingleChoice ? answers[question.id]?.optionId !== undefined : true;

  function handleSelect(optionId: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));
  }

  function buildSubmission() {
    const templateQuestionAnswers: AnswerChoice[] = [];
    const customQuestionAnswers: AnswerChoice[] = [];

    for (const q of questions as QuestionWithRule[]) {
      const answer: AnswerChoice = {
        questionId: q.id,
        questionType: q.questionType,
        optionId: answers[q.id]?.optionId,
        // Every question shares one measured duration for now - see the per-question TODO below.
        duration: Math.round((Date.now() - questionStartedAt.current) / 1000),
      };
      if (q.section === "PRIMARY_QUESTION") {
        templateQuestionAnswers.push(answer);
      } else {
        customQuestionAnswers.push(answer);
      }
    }

    return {
      templateQuestionAnswers,
      customQuestionAnswers,
      sessionId: undefined,
      surveyId: meta?.surveyId,
    };
  }

  async function handleNext() {
    if (!isLast) {
      setCurrentStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submit(buildSubmission());
      setFinished(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Хариултыг илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setSubmitting(false);
    }
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
          <Button nativeButton={false} render={<Link href={`/s/${code}`} />}>
            Нүүр хуудас руу буцах
          </Button>
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
          <div className="space-y-2">
            <Progress value={progress}>
              <ProgressValue />
            </Progress>
          </div>

          <Card className="p-6 space-y-6">
            <p className="text-lg font-medium text-foreground text-wrap-balance leading-relaxed">
              {currentStep + 1}. {question.content}
              {question.isRequired && (
                <Badge variant="destructive" className="ml-2 align-middle">
                  *
                </Badge>
              )}
            </p>

            {isSingleChoice ? (
              <div className="space-y-3">
                {(question.options ?? []).map((option) => {
                  const selected = answers[question.id]?.optionId === option.id;
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
                      <span className="text-foreground">{option.content}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // TODO: only SINGLE_CHOICE has a real input so far. MULTI_CHOICE, DROPDOWN,
              // STAR_RATING, NUMBER_RATING, YES_NO, MATRIX, NUMBER_INPUT, TEXT(_INPUT),
              // LONG_TEXT questions render as a pass-through notice and submit unanswered.
              <p className="text-sm text-muted-foreground italic">
                Энэ төрлийн асуултын ({question.questionType}) UI удахгүй нэмэгдэнэ.
              </p>
            )}
          </Card>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

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
            <Button size="lg" disabled={!canProceed || submitting} onClick={handleNext}>
              {submitting ? "Илгээж байна…" : isLast ? "Дуусгах" : "Үргэлжлүүлэх"}
              {!isLast && !submitting && <ArrowRight className="size-4" />}
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
