import { NextResponse } from "next/server";
import { getConsoleState } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export function GET() {
  const state = getConsoleState();

  return NextResponse.json({
    auditEvents: state.auditEvents,
    cases: state.cases,
    reviews: state.reviews,
  });
}
