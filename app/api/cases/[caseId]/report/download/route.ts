import { NextResponse } from "next/server";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";
import { addAudit, apiError, getConsoleState, getDefaultReview } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

type CaseRouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function POST(_request: Request, context: CaseRouteContext) {
  const { caseId } = await context.params;
  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);

  if (!caseRecord) {
    return apiError("NOT_FOUND", "Case was not found.", 404);
  }

  const review = state.reviews[caseId] ?? getDefaultReview(caseId, state.sessionUser.name);

  if (review.decision !== "Approved for release") {
    return apiError("FORBIDDEN", "Doctor approval is required before report download.", 403);
  }

  if (getCaseClassification(caseRecord).kind === "quality_blocked") {
    return apiError("FORBIDDEN", "Quality-blocked scans cannot generate a clinical report.", 403);
  }

  addAudit(`PDF mock downloaded for ${caseId}`);

  return NextResponse.json({
    reportNumber: `TE-RPT-${caseId.replace(/\D/g, "")}`,
    screeningResult: getCaseClassification(caseRecord).kind,
    status: "downloaded",
    auditEvents: state.auditEvents,
  });
}
