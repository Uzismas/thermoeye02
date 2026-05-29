import { NextResponse } from "next/server";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";
import { addAudit, getConsoleState, upsertCase } from "@/features/clinical-console/server/store";
import type { CaseRecord } from "@/features/clinical-console/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { caseRecord?: unknown; fileName?: unknown } | null;
  const fileName = typeof body?.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "scan package";

  if (fileName.length > 180 || /[<>]/.test(fileName)) {
    return NextResponse.json({ code: "BAD_REQUEST", message: "Upload file name is invalid." }, { status: 400 });
  }

  if (isCaseRecord(body?.caseRecord)) {
    body.caseRecord.clinicalClassification = getCaseClassification(body.caseRecord);
    upsertCase(body.caseRecord);
    addAudit(`Uploaded ${fileName} and ran locked screening ruleset for ${body.caseRecord.id}`);
  } else {
    addAudit(`Hospital staff queued ${fileName} for secure screening`);
  }

  return NextResponse.json({
    status: "queued",
    label: "Scan package queued for quarantine",
    auditEvents: getConsoleState().auditEvents,
  });
}

function isCaseRecord(value: unknown): value is CaseRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CaseRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.age === "number" &&
    (record.sex === "F" || record.sex === "M") &&
    typeof record.scanType === "string" &&
    (record.eye === "OD" || record.eye === "OS" || record.eye === "OU") &&
    (record.riskLevel === "low" || record.riskLevel === "moderate" || record.riskLevel === "high" || record.riskLevel === "blocked") &&
    typeof record.riskScore === "number" &&
    typeof record.qualityLabel === "string" &&
    typeof record.status === "string" &&
    typeof record.context === "string" &&
    typeof record.confidence === "string" &&
    typeof record.density === "string" &&
    typeof record.heatmap === "string" &&
    typeof record.note === "string" &&
    (
      record.analysisMetrics === undefined ||
      (
        typeof record.analysisMetrics === "object" &&
        typeof record.analysisMetrics.vesselDensity === "number" &&
        typeof record.analysisMetrics.fazRiskProxy === "number" &&
        typeof record.analysisMetrics.perfusionDensityProxy === "number"
      )
    )
  );
}
