import { NextResponse } from "next/server";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";
import { apiError, getConsoleState, getDefaultReview } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

type CaseRouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: Request, context: CaseRouteContext) {
  const { caseId } = await context.params;
  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);

  if (!caseRecord) {
    return apiError("NOT_FOUND", "Case was not found.", 404);
  }

  const review = state.reviews[caseId] ?? getDefaultReview(caseId, state.sessionUser.name);

  return NextResponse.json({
    caseRecord,
    clinicalClassification: getCaseClassification(caseRecord),
    review,
    releaseStatus: review.decision === "Approved for release" ? "ready" : "locked",
  });
}
