import { useEffect, useState } from "react";
import { type MockSurvey, mockSurvey } from "@/lib/mock-survey";

export function useSurvey(code: string) {
  const [data, setData] = useState<MockSurvey | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ ...mockSurvey, code });
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  return { data };
}
