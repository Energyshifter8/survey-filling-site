import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import FontSizeToggle from "@/components/FontSizeToggle";
import MindXLogo from "@/components/MindXLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockSurvey } from "@/lib/mock-survey";

export default function LandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  return <LandingContent code={code} />;
}

function LandingContent({ code }: { code: string }) {
  const { data: survey } = useQuery({
    queryKey: ["survey", code],
    queryFn: () => Promise.resolve(mockSurvey),
  });

  if (!survey) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <Card className="max-w-[700px] w-full text-center p-8 md:p-12 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {survey.title}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{survey.description}</p>
          <p className="text-sm text-muted-foreground/60 italic">
            Судалгаа нийтлэгч:{" "}
            <span className="font-medium text-muted-foreground not-italic">
              {survey.publisherName}
            </span>
          </p>
          <Button size="lg" render={<Link href={`/s/${code}/tip`} />}>
            Шалгаж үзэх
            <ArrowRight className="size-4" />
          </Button>
        </Card>
      </main>

      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>
    </div>
  );
}
