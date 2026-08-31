import Link from "next/link";
import MindXLogo from "@/components/MindXLogo";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <MindXLogo className="mb-8" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
        Судалгааны сайт
      </h1>
      <p className="text-gray-500 text-center max-w-md">
        Зүүн дэх холбоосоор дамжуулан судалгаагаа бөглөнө үү.
      </p>
      <Link
        href="/s/demo123"
        className="mt-8 px-6 py-3 rounded-lg bg-[#7C86F0] text-white font-medium hover:bg-indigo-500 transition-colors"
      >
        Дemo судалгаа руу орох
      </Link>
    </main>
  );
}
