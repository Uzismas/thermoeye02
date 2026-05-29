"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnalysisView } from "./components/analysis-view";
import { CasesView } from "./components/cases-view";
import { Sidebar, Topbar } from "./components/console-layout";
import { DashboardView } from "./components/dashboard-view";
import { GovernanceView } from "./components/governance-view";
import { InsightsView } from "./components/insights-view";
import { LoginGate } from "./components/login-gate";
import { PerformanceView } from "./components/performance-view";
import { ReportView } from "./components/report-view";
import { getCaseClassification } from "./clinical-analysis";
import { cases, initialAuditEvents } from "./mock-data";
import type { AuditEvent, CaseRecord, ReviewRecord, SessionUser, ViewId } from "./types";

const viewIds: ViewId[] = [
  "dashboard",
  "cases",
  "patients",
  "analysis",
  "report",
  "insights",
  "performance",
  "governance",
  "settings",
];

const viewSet = new Set<string>(viewIds);

const viewTitles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  cases: "Upload New Scan",
  patients: "Patients",
  analysis: "Analysis Results",
  report: "Clinical Report Preview",
  insights: "Data Insights",
  performance: "Model Performance",
  governance: "Data Management",
  settings: "Settings",
};

type ConsoleStatePayload = {
  auditEvents: AuditEvent[];
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
};

export function ThermoeyeConsole({ initialView = "dashboard" }: { initialView?: ViewId }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [caseRecords, setCaseRecords] = useState<CaseRecord[]>(cases);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0].id);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditEvents);
  const [uploadLabel, setUploadLabel] = useState("Drop OCTA/OCT file or choose file");
  const [reviewState, setReviewState] = useState<Record<string, ReviewRecord>>({});
  const [loginError, setLoginError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const activeView = getViewFromPathname(pathname) ?? initialView;

  const selectedCase = useMemo(
    () => caseRecords.find((caseRecord) => caseRecord.id === selectedCaseId) ?? caseRecords[0] ?? cases[0],
    [caseRecords, selectedCaseId],
  );

  const selectedReview = reviewState[selectedCase.id] ?? getDefaultReview(selectedCase, sessionUser?.name);

  useEffect(() => {
    document.title = `${viewTitles[activeView]} | Thermoeye Clinical Console`;
  }, [activeView]);

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        const result = await fetchJson<{ user: SessionUser }>("/api/session");
        if (isCurrent) {
          setSessionUser(result.user);
        }
      } catch {
        // No active mock session is expected on first visit.
      } finally {
        if (isCurrent) {
          setIsRestoringSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadConsoleState() {
      try {
        const state = await fetchJson<ConsoleStatePayload>("/api/console-state");
        if (!isCurrent) return;
        setCaseRecords(state.cases);
        setAuditEvents(state.auditEvents);
        setReviewState(state.reviews);
      } catch (error) {
        if (isCurrent) {
          setActionError(getErrorMessage(error));
        }
      }
    }

    if (sessionUser) {
      void loadConsoleState();
    }

    return () => {
      isCurrent = false;
    };
  }, [sessionUser]);

  if (!sessionUser) {
    return (
      <LoginGate
        errorMessage={loginError}
        isLoading={isLoginLoading || isRestoringSession}
        onLogin={handleLogin}
      />
    );
  }

  function navigate(viewId: ViewId) {
    router.push(`/console/${viewId}`, { scroll: false });
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsLoginLoading(true);
    setLoginError("");

    try {
      const result = await fetchJson<{ user: SessionUser }>("/api/session", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setSessionUser(result.user);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setIsLoginLoading(false);
    }
  }

  async function updateReview(review: ReviewRecord) {
    setActionError("");

    try {
      const result = await fetchJson<{ review: ReviewRecord; auditEvents: AuditEvent[] }>(
        `/api/cases/${selectedCase.id}/review`,
        {
          method: "POST",
          body: JSON.stringify(review),
        },
      );
      setReviewState((current) => ({ ...current, [selectedCase.id]: result.review }));
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function openReportPreview() {
    setActionError("");

    try {
      await fetchJson(`/api/cases/${selectedCase.id}/report/preview`);
      const result = await postAudit(`Report preview opened for ${selectedCase.id}`);
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }

    navigate("report");
  }

  async function downloadReportMock() {
    setActionError("");

    try {
      const result = await fetchJson<{ auditEvents: AuditEvent[] }>(`/api/cases/${selectedCase.id}/report/download`, {
        method: "POST",
      });
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function queueUpload() {
    setIsQueueing(true);
    setActionError("");

    try {
      const result = await fetchJson<{ auditEvents: AuditEvent[]; label: string }>("/api/uploads/queue", {
        method: "POST",
        body: JSON.stringify({
          fileName: uploadLabel.endsWith(" selected") ? uploadLabel.replace(/ selected$/, "") : "scan package",
        }),
      });
      setUploadLabel(result.label);
      setAuditEvents(result.auditEvents);
      navigate("governance");
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsQueueing(false);
    }
  }

  async function createUploadedDemoCase(caseRecord: CaseRecord) {
    setActionError("");
    setCaseRecords((current) => [caseRecord, ...current.filter((item) => item.id !== caseRecord.id)]);
    setSelectedCaseId(caseRecord.id);
    setReviewState((current) => ({ ...current, [caseRecord.id]: getDefaultReview(caseRecord, sessionUser?.name) }));
    setUploadLabel(`${caseRecord.uploadedFileName ?? "Uploaded scan"} classified by locked screening ruleset`);

    try {
      const result = await fetchJson<{ auditEvents: AuditEvent[] }>("/api/uploads/queue", {
        method: "POST",
        body: JSON.stringify({
          caseRecord: {
            ...caseRecord,
            uploadedImageUrl: undefined,
          },
          fileName: caseRecord.uploadedFileName ?? "scan",
        }),
      });
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }

    navigate("analysis");
  }

  async function logout() {
    try {
      await fetchJson("/api/session", { method: "DELETE" });
    } catch {
      // Local logout should still clear the UI if the mock API is unavailable.
    }

    setSessionUser(null);
    navigate("dashboard");
  }

  async function exportAudit() {
    setActionError("");

    try {
      const result = await postAudit("Audit export requested by pilot administrator");
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }

    navigate("governance");
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} />

      <main className="workspace">
        <Topbar
          onNavigate={navigate}
          user={sessionUser}
          onLogout={logout}
          onAuditExport={exportAudit}
        />

        {actionError ? (
          <p className="workspace-alert" role="alert">
            {actionError}
          </p>
        ) : null}

        {activeView === "dashboard" ? (
          <DashboardView
            cases={caseRecords}
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            onCaseSelect={setSelectedCaseId}
            onNavigate={navigate}
            reviewer={sessionUser.name}
            onReviewSubmit={updateReview}
            onPreviewReport={openReportPreview}
          />
        ) : null}

        {activeView === "cases" ? (
          <CasesView
            errorMessage={actionError}
            isQueueing={isQueueing}
            uploadLabel={uploadLabel}
            onCreateDemoCase={createUploadedDemoCase}
            onFileSelected={setUploadLabel}
            onQueueUpload={queueUpload}
          />
        ) : null}

        {activeView === "analysis" ? <AnalysisView selectedCase={selectedCase} /> : null}
        {activeView === "patients" ? (
          <PatientsView
            cases={caseRecords}
            onCaseSelect={(caseId) => {
              setSelectedCaseId(caseId);
              navigate("analysis");
            }}
          />
        ) : null}
        {activeView === "insights" ? <InsightsView /> : null}
        {activeView === "performance" ? <PerformanceView /> : null}
        {activeView === "governance" ? <GovernanceView auditEvents={auditEvents} /> : null}
        {activeView === "settings" ? <SettingsView /> : null}
        {activeView === "report" ? (
          <ReportView
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            onBack={navigate}
            onDownload={downloadReportMock}
          />
        ) : null}
      </main>
    </div>
  );
}

function getViewFromPathname(pathname: string): ViewId | null {
  const segment = pathname.split("/").filter(Boolean).at(1);
  return segment && viewSet.has(segment) ? (segment as ViewId) : null;
}

function PatientsView({ cases, onCaseSelect }: { cases: CaseRecord[]; onCaseSelect: (caseId: string) => void }) {
  return (
    <section className="view active" aria-labelledby="patients-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Patient registry</p>
          <h1 id="patients-title">Patients</h1>
        </div>
        <p className="section-note">De-identified screening queue scoped to Bangkok Neurology Hospital.</p>
      </div>

      <div className="patient-grid">
        {cases.map((caseRecord) => (
          <article className="panel patient-card" key={caseRecord.id}>
            <div className="patient-avatar" aria-hidden="true">
              {caseRecord.sex}
            </div>
            <div>
              <h2>{caseRecord.id.replace("TE", "PT")}</h2>
              <p>{caseRecord.age} years · {caseRecord.sex === "F" ? "Female" : "Male"} · {caseRecord.scanType} {caseRecord.eye}</p>
            </div>
            <span className={`risk-chip ${caseRecord.riskLevel}`}>
              {caseRecord.riskLevel === "blocked" ? "Blocked" : `${caseRecord.riskScore / 100} risk`}
            </span>
            <button className="ghost-button wide" type="button" onClick={() => onCaseSelect(caseRecord.id)}>
              Open analysis
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function getDefaultReview(caseRecord: CaseRecord, reviewer = "Unassigned"): ReviewRecord {
  const classification = getCaseClassification(caseRecord);
  const isBlocked = classification.kind === "quality_blocked";
  const isRisk = classification.kind === "alzheimer_risk";

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

async function postAudit(message: string) {
  return fetchJson<{ auditEvents: AuditEvent[] }>("/api/audit", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => null)) as { message?: unknown } | T | null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message
      : "The clinical console API request failed.";
    throw new Error(message);
  }

  return data as T;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected clinical console error.";
}

function SettingsView() {
  return (
    <section className="view active" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1 id="settings-title">Settings</h1>
        </div>
        <p className="section-note">Tenant, notifications, model threshold, and clinical workflow defaults.</p>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tenant</p>
              <h2>Hospital configuration</h2>
            </div>
            <span className="badge secure">Active</span>
          </div>
          <div className="settings-list">
            <span><strong>Hospital</strong><em>Bangkok Neurology Hospital</em></span>
            <span><strong>Region</strong><em>Thailand pilot</em></span>
            <span><strong>Retention</strong><em>24 months</em></span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI defaults</p>
              <h2>Screening thresholds</h2>
            </div>
            <span className="badge">2026.05</span>
          </div>
          <div className="settings-list">
            <span><strong>Normal</strong><em>Preserved VD and FAZ/perfusion proxy</em></span>
            <span><strong>Alzheimer risk</strong><em>Reduced VD or elevated FAZ/perfusion proxy</em></span>
            <span><strong>Doctor approval</strong><em>Required before release</em></span>
          </div>
        </section>
      </div>
    </section>
  );
}
