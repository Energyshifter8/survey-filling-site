import { ArrowRight } from "lucide-react";
import Link from "next/link";
import MindXLogo from "@/components/MindXLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <Card className="max-w-md w-full text-center p-8 space-y-6">
        <MindXLogo className="justify-center" />
        <h1 className="text-3xl font-bold text-foreground">Судалгааны сайт</h1>
        <p className="text-muted-foreground">
          Зүүн дэх холбоосоор дамжуулан судалгаагаа бөглөнө үү.
        </p>
        <Button size="lg" nativeButton={false} render={<Link href="/s/demo123" />}>
          Судалгаа руу орох
          <ArrowRight className="size-4" />
        </Button>
      </Card>
    </main>
  );
}
