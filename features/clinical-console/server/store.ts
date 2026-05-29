import { NextResponse } from "next/server";
import { createCaseFromClinicalInput, getCaseClassification } from "../clinical-analysis";
import { cases, initialAuditEvents } from "../mock-data";
import type { AuditEvent, CaseRecord, ReviewDecision, ReviewRecord, SessionUser } from "../types";

export type ConsoleState = {
  auditEvents: AuditEvent[];
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  sessionUser: SessionUser;
  schemaVersion: string;
};

type ApiErrorCode = "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND";

const sessionUser: SessionUser = {
  name: "Dr. Kritsadapa S.",
  role: "Doctor",
  hospital: "Sirindhorn Memory Clinic",
};

const globalStore = globalThis as typeof globalThis & {
  thermoeyeConsoleState?: ConsoleState;
};

const schemaVersion = "clinical-ruleset-2026.05";

export function getConsoleState(): ConsoleState {
  globalStore.thermoeyeConsoleState ??= {
    auditEvents: initialAuditEvents,
    cases,
    reviews: {},
    sessionUser,
    schemaVersion,
  };

  migrateConsoleState(globalStore.thermoeyeConsoleState);
  return globalStore.thermoeyeConsoleState;
}

export function addAudit(message: string): AuditEvent {
  const event = {
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    message,
  };

  getConsoleState().auditEvents = [event, ...getConsoleState().auditEvents];
  return event;
}

export function upsertCase(caseRecord: CaseRecord) {
  const state = getConsoleState();
  const normalizedCase = normalizeCaseRecord(caseRecord);
  state.cases = [normalizedCase, ...state.cases.filter((item) => item.id !== normalizedCase.id)];
  return normalizedCase;
}

export function getDefaultReview(caseId: string, reviewer = "Unassigned"): ReviewRecord {
  const caseRecord = getConsoleState().cases.find((item) => item.id === caseId);
  const classification = caseRecord ? getCaseClassification(caseRecord) : null;
  const isBlocked = classification?.kind === "quality_blocked";
  const isRisk = classification?.kind === "alzheimer_risk";

  return {
    decision: isBlocked ? "Rescan requested" : "Pending review",
    note: isBlocked
      ? "Image quality is blocked. Request a rescan before report release."
      : isRisk
        ? "Alzheimer-risk screening pattern requires clinician correlation before report release."
        : "Normal screening pattern. Awaiting doctor review before report release.",
    reviewer,
    followUpWindow: isBlocked ? "Rescan first" : isRisk ? "30 days" : "Routine",
    updatedAt: "Not reviewed",
  };
}

export function validateReviewInput(input: unknown): { ok: true; review: ReviewRecord } | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Review payload is required." };
  }

  const record = input as Record<string, unknown>;
  const decision = record.decision;
  const followUpWindow = record.followUpWindow;
  const note = record.note;

  if (!isReviewDecision(decision)) {
    return { ok: false, message: "Review decision is invalid." };
  }

  if (!isFollowUpWindow(followUpWindow)) {
    return { ok: false, message: "Follow-up window is invalid." };
  }

  if (typeof note !== "string" || note.trim().length < 8 || note.length > 600) {
    return { ok: false, message: "Clinical note must be 8-600 characters." };
  }

  return {
    ok: true,
    review: {
      decision,
      followUpWindow,
      note: note.trim(),
      reviewer: getConsoleState().sessionUser.name,
      updatedAt: new Date().toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    },
  };
}

export function apiError(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ code, message }, { status });
}

function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    value === "Pending review" ||
    value === "Approved for release" ||
    value === "Follow-up required" ||
    value === "Rescan requested"
  );
}

function isFollowUpWindow(value: unknown): value is ReviewRecord["followUpWindow"] {
  return value === "Routine" || value === "30 days" || value === "90 days" || value === "Rescan first";
}

function migrateConsoleState(state: ConsoleState) {
  if (state.schemaVersion === schemaVersion) return;

  const currentSeedCases = new Map(cases.map((caseRecord) => [caseRecord.id, caseRecord]));
  const normalizedCases = state.cases.map((caseRecord) => currentSeedCases.get(caseRecord.id) ?? normalizeCaseRecord(caseRecord));
  const existingIds = new Set(normalizedCases.map((caseRecord) => caseRecord.id));

  state.cases = [
    ...normalizedCases,
    ...cases.filter((caseRecord) => !existingIds.has(caseRecord.id)),
  ];
  state.reviews = {};
  state.schemaVersion = schemaVersion;
}

function normalizeCaseRecord(caseRecord: CaseRecord): CaseRecord {
  if (!caseRecord.analysisMetrics) {
    const classification = getCaseClassification(caseRecord);

    return {
      ...caseRecord,
      clinicalClassification: classification,
      heatmap: classification.kind === "normal" ? "Low attention" : classification.kind === "alzheimer_risk" ? "AD-risk attention" : "Quality blocked",
      note: classification.finding,
      riskLevel: classification.riskLevel,
      riskScore: classification.riskScore,
      status: classification.kind === "quality_blocked" ? "Rescan needed" : caseRecord.status,
    };
  }

  return createCaseFromClinicalInput({
    age: caseRecord.age,
    caseCode: caseRecord.id,
    eye: caseRecord.eye,
    fileName: caseRecord.uploadedFileName,
    metrics: caseRecord.analysisMetrics,
    scanType: caseRecord.scanType,
    sex: caseRecord.sex,
    uploadedImageUrl: caseRecord.uploadedImageUrl,
  });
}
