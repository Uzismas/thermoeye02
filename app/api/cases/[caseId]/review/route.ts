import { NextResponse } from "next/server";
import {
  addAudit,
  apiError,
  getConsoleState,
  getDefaultReview,
  validateReviewInput,
} from "@/features/clinical-console/server/store";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";

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

  return NextResponse.json({
    review: state.reviews[caseId] ?? getDefaultReview(caseId, state.sessionUser.name),
  });
}

export async function POST(request: Request, context: CaseRouteContext) {
  const { caseId } = await context.params;
  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);

  if (!caseRecord) {
    return apiError("NOT_FOUND", "Case was not found.", 404);
  }

  const result = validateReviewInput(await request.json().catch(() => null));

  if (!result.ok) {
    return apiError("BAD_REQUEST", result.message, 400);
  }

  if (getCaseClassification(caseRecord).kind === "quality_blocked" && result.review.decision === "Approved for release") {
    return apiError("FORBIDDEN", "Blocked image quality cannot be approved for report release.", 403);
  }

  state.reviews[caseId] = result.review;
  addAudit(`${result.review.decision} for ${caseId} by ${result.review.reviewer}`);

  return NextResponse.json({
    review: result.review,
    auditEvents: state.auditEvents,
  });
}
