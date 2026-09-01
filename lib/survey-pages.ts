import type { PageDTO, PageType, SurveyPublicDto } from "@/lib/api/types";

/** Finds the first page of a given type across all sections (START/TEST/END) of a survey. */
export function findSurveyPage(survey: SurveyPublicDto, pageType: PageType): PageDTO | undefined {
  return Object.values(survey.pages ?? {})
    .flat()
    .find((page) => page?.pageType === pageType);
}
