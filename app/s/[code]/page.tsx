import Link from "next/link";
import MindXLogo from "@/components/MindXLogo";
import FontSizeToggle from "@/components/FontSizeToggle";
import { mockSurvey } from "@/lib/mock-survey";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const survey = mockSurvey;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top-right font toggle */}
      <div className="fixed top-4 right-4 z-40">
        <FontSizeToggle />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-[700px] text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            {survey.title}
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-8">
            {survey.description}
          </p>
          <p className="text-sm text-gray-400 italic mb-10">
            Судалгаа нийтлэгч:{" "}
            <span className="font-medium text-gray-500 not-italic">
              {survey.publisherName}
            </span>
          </p>
          <Link
            href={`/s/${code}/tip`}
            className="inline-block px-8 py-4 rounded-lg bg-[#7C86F0] text-white font-semibold text-lg hover:bg-indigo-500 transition-colors"
          >
            Шалгаж үзэх
          </Link>
        </div>
      </main>

      {/* Bottom-left logo */}
      <div className="fixed bottom-4 left-4 z-40">
        <MindXLogo />
      </div>
    </div>
  );
}
