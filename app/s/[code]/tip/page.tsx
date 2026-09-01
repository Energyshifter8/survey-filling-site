"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsentModal from "@/components/ConsentModal";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { mockSurvey } from "@/lib/mock-survey";

export default function TipPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const { data: survey } = useQuery({
    queryKey: ["survey", code],
    queryFn: () => Promise.resolve(mockSurvey),
  });

  const [consentGiven, setConsentGiven] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!survey) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-[700px] w-full space-y-8">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight text-center">
            {survey.title}
          </h1>

          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              <span className="text-sm font-medium">{survey.questionCount} асуулт</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-400" />
              <span className="text-sm font-medium">
                {survey.estimatedMinutes.min}-{survey.estimatedMinutes.max} минут
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-base leading-relaxed text-left text-wrap-balance">
            Энэхүү судалгаанд хариулахдаа тухайн асуултын хариултуудаас өөрийн хамгийн тохирохыг
            нэгийг нь сонгоно уу. Зарим асуултууд заавал хариулах шаардлагатай байж болох тул
            анхаарна уу.
          </p>

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
            <Button
              size="lg"
              disabled={!consentGiven}
              onClick={() => router.push(`/s/${code}/questions`)}
            >
              Цааш
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
