"use client";

import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsentModal from "@/components/ConsentModal";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { findSurveyPage } from "@/lib/survey-pages";
import { startSurveySession, useSurveyMeta } from "@/lib/use-survey";

export default function TipPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const { meta, loading, error } = useSurveyMeta(code);

  const [consentGiven, setConsentGiven] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [passCode, setPassCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) return null;

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (!meta) return null;

  const { survey, surveyId } = meta;
  const tipPage = findSurveyPage(survey, "TIP") ?? findSurveyPage(survey, "SURVEY_START");
  const needsPassCode = survey.passCodeProtected;
  const canContinue = consentGiven && (!needsPassCode || passCode.trim().length > 0) && !starting;

  async function handleContinue() {
    setStarting(true);
    setStartError(null);
    try {
      await startSurveySession(code, surveyId, needsPassCode ? passCode.trim() : undefined);
      router.push(`/s/${code}/questions`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Судалгаанд орох үед алдаа гарлаа.");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-[700px] w-full space-y-8">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight text-center">
            {tipPage?.title ?? survey.creator}
          </h1>

          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              <span className="text-sm font-medium">{survey.questionCount} асуулт</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-400" />
              <span className="text-sm font-medium">
                {survey.minMinutes}-{survey.maxMinutes} минут
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-base leading-relaxed text-left text-wrap-balance">
            {tipPage?.content ??
              "Энэхүү судалгаанд хариулахдаа тухайн асуултын хариултуудаас өөрийн хамгийн тохирохыг нэгийг нь сонгоно уу. Зарим асуултууд заавал хариулах шаардлагатай байж болох тул анхаарна уу."}
          </p>

          {needsPassCode && (
            <div className="space-y-2">
              <label htmlFor="passCode" className="text-sm font-medium text-foreground">
                Нэвтрэх код
              </label>
              <input
                id="passCode"
                type="text"
                maxLength={8}
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                placeholder="Нэвтрэх кодоо оруулна уу"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          )}

          <button
            type="button"
            className="flex items-start gap-3 cursor-pointer text-left group w-full"
            onClick={() => !consentGiven && setShowModal(true)}
          >
            <Checkbox checked={consentGiven} readOnly className="pointer-events-none mt-0.5" />
            <span className="text-sm text-muted-foreground leading-relaxed select-none">
              Зөвшөөрлийн хуудастай танилцсан болно.
            </span>
          </button>

          {startError && <p className="text-sm text-destructive">{startError}</p>}

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/s/${code}`} />}
            >
              <ArrowLeft className="size-4" />
              Буцах
            </Button>
            <Button size="lg" disabled={!canContinue} onClick={handleContinue}>
              {starting ? "Ачаалж байна…" : "Цааш"}
            </Button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>

      <ConsentModal
        open={showModal}
        onAccept={() => {
          setConsentGiven(true);
          setShowModal(false);
        }}
        onDecline={() => setShowModal(false)}
      />
    </div>
  );
}
