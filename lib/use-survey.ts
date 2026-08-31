import { useQuery } from "@tanstack/react-query";
import { type MockSurvey, mockSurvey } from "@/lib/mock-survey";

function fetchSurvey(code: string): Promise<MockSurvey> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...mockSurvey, code });
    }, 300);
  });
}

export function useSurvey(code: string) {
  return useQuery({
    queryKey: ["survey", code],
    queryFn: () => fetchSurvey(code),
  });
}
