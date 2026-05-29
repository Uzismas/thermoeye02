import type { CSSProperties } from "react";
import { clinicalModelVersion, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { dashboardMetrics } from "../mock-data";
import type { CaseRecord, ReviewDecision, ReviewRecord, ViewId } from "../types";
import { riskTone, titleCase } from "../utils";
import { PanelHeader, SectionHeading } from "./shared";

export function DashboardView({
  cases,
  selectedCase,
  selectedReview,
  onCaseSelect,
  onNavigate,
  reviewer,
  onReviewSubmit,
  onPreviewReport,
}: {
  cases: CaseRecord[];
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  onCaseSelect: (caseId: string) => void;
  onNavigate: (viewId: ViewId) => void;
  reviewer: string;
  onReviewSubmit: (review: ReviewRecord) => void;
  onPreviewReport: () => void;
}) {
  return (
    <section className="view active" aria-labelledby="dashboard-title">
      <SectionHeading
        eyebrow="OCTA retinal biomarker workflow for Alzheimer's screening research"
        title="Welcome back, Dr. Nattapong"
        note="Clinical decision-support view grounded in OCTA vessel density, perfusion density, and FAZ signals."
      />

      <section className="ops-hero dashboard-ops" aria-labelledby="dashboard-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Live pilot workspace</p>
          <h2 id="dashboard-ops-title">Retina-to-brain screening run</h2>
          <p>
            Prioritize cases with reduced retinal vessel density, FAZ enlargement, and lower perfusion density while keeping every report doctor-approved.
          </p>
          <div className="ops-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("analysis")}>
              Review priority case
            </button>
            <button className="ghost-button" type="button" onClick={() => onNavigate("cases")}>
              Queue new scan
            </button>
          </div>
        </div>
        <div className="ops-status-grid" aria-label="Screening run status">
          <span>
            <strong>14</strong>
            <em>Doctor reviews waiting</em>
            <small>5 include VD/DCP signal</small>
          </span>
          <span>
            <strong>96%</strong>
            <em>OCTA quality pass rate</em>
            <small>Artifact and focus gate</small>
          </span>
          <span>
            <strong>VD</strong>
            <em>Top retinal marker</em>
            <small>DCP/SCP density proxy</small>
          </span>
          <span>
            <strong>0</strong>
            <em>Reports without review</em>
            <small>Clinical safety gate</small>
          </span>
        </div>
      </section>

      <div className="metrics-grid">
        {dashboardMetrics.map((metric, index) => (
          <article className={`metric metric-${metric.tone}`} key={metric.label}>
            <span className="metric-icon" aria-hidden="true">{["▣", "☷", "⌾", "▤"][index]}</span>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small className={metric.caption.startsWith("+") ? "trend-up" : undefined}>{metric.caption}</small>
            <MetricMiniChart tone={metric.tone} index={index} />
          </article>
        ))}
      </div>

      <StatusDashboard />

      <div className="dashboard-main-grid">
        <section className="panel queue-panel" aria-labelledby="queue-title">
          <PanelHeader eyebrow="Recent analysis" title="Recent Analyses" badge="View all" />
          <CaseTable cases={cases} selectedCaseId={selectedCase.id} onCaseSelect={onCaseSelect} />
          <div className="panel-link-row">
            <button className="text-button" type="button" onClick={() => onNavigate("analysis")}>Go to Analysis Results</button>
          </div>
        </section>

        <UploadShortcut onNavigate={() => onNavigate("cases")} />

        <section className="panel distribution-panel" aria-labelledby="risk-dist-title">
          <PanelHeader eyebrow="Risk Level Distribution" title="Risk Level Distribution" badge="1,248 scans" />
          <RiskDonut />
        </section>
      </div>

      <div className="dashboard-main-grid secondary">
        <AiInsightCard />
        <ActiveCasePanel
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            reviewer={reviewer}
            onReviewSubmit={onReviewSubmit}
            onOpenAnalysis={() => onNavigate("analysis")}
            onPreviewReport={onPreviewReport}
          />
      </div>
    </section>
  );
}

function CaseTable({
  cases,
  selectedCaseId,
  onCaseSelect,
}: {
  cases: CaseRecord[];
  selectedCaseId: string;
  onCaseSelect: (caseId: string) => void;
}) {
  return (
    <table className="case-table">
      <caption className="visually-hidden">Recent Thermoeye cases</caption>
      <thead>
          <tr className="case-row table-head">
          <th scope="col">Patient ID</th>
          <th scope="col">Risk Score</th>
          <th scope="col">Risk Level</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((caseRecord) => (
          <tr className={`case-row ${selectedCaseId === caseRecord.id ? "active" : ""}`} key={caseRecord.id}>
            <td>
              <button
                className="case-select-button"
                type="button"
                onClick={() => onCaseSelect(caseRecord.id)}
                aria-pressed={selectedCaseId === caseRecord.id}
              >
                <strong>{caseRecord.id.replace("TE", "PT")}</strong>
                <small>
                  12 May 2025 · {caseRecord.scanType} {caseRecord.eye}
                </small>
              </button>
            </td>
            <td>{caseRecord.riskLevel === "blocked" ? "N/A" : `0.${String(caseRecord.riskScore).padStart(2, "0")}`}</td>
            <td>
              <span className={`risk-chip ${riskTone[caseRecord.riskLevel]}`}>
                {caseRecord.riskLevel === "blocked" ? "Blocked" : titleCase(caseRecord.riskLevel)}
              </span>
            </td>
            <td>
              <span className={`status-pill ${caseRecord.status === "Report ready" ? "" : "pending"}`}>
                {caseRecord.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActiveCasePanel({
  selectedCase,
  selectedReview,
  reviewer,
  onReviewSubmit,
  onOpenAnalysis,
  onPreviewReport,
}: {
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  reviewer: string;
  onReviewSubmit: (review: ReviewRecord) => void;
  onOpenAnalysis: () => void;
  onPreviewReport: () => void;
}) {
  const classification = getCaseClassification(selectedCase);

  return (
    <section className="panel active-case" aria-labelledby="active-case-title">
      <PanelHeader eyebrow="Doctor workflow" title="Selected Case Review" badge="De-identified" badgeTone="secure" />

      <div className={`case-alert ${selectedCase.riskLevel}`}>
        <strong>
          {classification.kind === "quality_blocked" ? "Rescan required before AI reporting" : `${getClinicalResultLabel(classification.kind)} screening result`}
        </strong>
        <span>{classification.finding}</span>
      </div>

      <div className="case-focus">
        <div className="risk-meter reference-gauge" style={{ "--risk-fill": `${selectedCase.riskScore}%` } as CSSProperties}>
          <span>{selectedCase.riskScore}</span>
          <small>{getClinicalResultLabel(classification.kind)}</small>
        </div>
        <div className="case-summary">
          <dl>
            <div>
              <dt>Case code</dt>
              <dd>{selectedCase.id}</dd>
            </div>
            <div>
              <dt>Patient context</dt>
              <dd>{selectedCase.context}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{clinicalModelVersion} · threshold 2026.05</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="decision-strip">
        <span>{selectedCase.confidence}</span>
        <span>{selectedCase.density}</span>
        <span>{classification.label}</span>
        <span>{selectedReview.decision}</span>
        <span>{selectedReview.followUpWindow}</span>
      </div>

      <DoctorReviewPanel
        currentReview={selectedReview}
        reviewer={reviewer}
        onSubmit={onReviewSubmit}
      />

      <div className="actions-row">
        <button className="ghost-button" type="button" onClick={onPreviewReport}>
          Preview report
        </button>
        <button className="text-button" type="button" onClick={onOpenAnalysis}>
          Open analysis
        </button>
      </div>
    </section>
  );
}

function DoctorReviewPanel({
  currentReview,
  reviewer,
  onSubmit,
}: {
  currentReview: ReviewRecord;
  reviewer: string;
  onSubmit: (review: ReviewRecord) => void;
}) {
  return (
    <form
      className="review-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          decision: formData.get("decision") as ReviewDecision,
          followUpWindow: formData.get("followUpWindow") as ReviewRecord["followUpWindow"],
          note: String(formData.get("note") || ""),
          reviewer,
          updatedAt: new Date().toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        });
      }}
    >
      <div className="review-form-header">
        <div>
          <p className="eyebrow">Doctor review</p>
          <h3>Clinical decision record</h3>
        </div>
        <span className="badge">{currentReview.updatedAt}</span>
      </div>

      <div className="review-controls">
        <label>
          <span>Decision</span>
          <select name="decision" defaultValue={currentReview.decision} aria-label="Review decision">
            <option>Pending review</option>
            <option>Approved for release</option>
            <option>Follow-up required</option>
            <option>Rescan requested</option>
          </select>
        </label>
        <label>
          <span>Follow-up</span>
          <select name="followUpWindow" defaultValue={currentReview.followUpWindow} aria-label="Follow-up window">
            <option>Routine</option>
            <option>30 days</option>
            <option>90 days</option>
            <option>Rescan first</option>
          </select>
        </label>
      </div>

      <label className="review-note">
        <span>Clinical note</span>
        <textarea
          name="note"
          defaultValue={currentReview.note}
          rows={4}
          aria-label="Clinical review note"
        />
      </label>

      <button className="primary-button wide" type="submit">
        Save review decision
      </button>
    </form>
  );
}

function UploadShortcut({ onNavigate }: { onNavigate: () => void }) {
  return (
    <section className="panel upload-shortcut" aria-labelledby="upload-shortcut-title">
      <PanelHeader eyebrow="Upload New OCTA Scan" title="Upload New OCTA Scan" badge="DICOM" />
      <button className="dropzone compact" type="button" onClick={onNavigate}>
        <span className="drop-mark" aria-hidden="true" />
        <strong>Drag and drop OCTA images</strong>
        <small>or browse files</small>
      </button>
      <button className="primary-button wide" type="button" onClick={onNavigate}>Browse Files</button>
    </section>
  );
}

function MetricMiniChart({ tone, index }: { tone: string; index: number }) {
  const series = [
    [46, 58, 52, 72, 68, 84],
    [78, 74, 82, 86, 91, 96],
    [32, 36, 34, 40, 38, 42],
    [18, 24, 21, 28, 30, 34],
  ][index] ?? [40, 48, 52, 58, 64, 70];

  return (
    <div className={`metric-bars ${tone}`} aria-hidden="true">
      {series.map((value, itemIndex) => (
        <i style={{ "--bar": `${value}%` } as CSSProperties} key={`${value}-${itemIndex}`} />
      ))}
    </div>
  );
}

function StatusDashboard() {
  return (
    <section className="panel status-dashboard" aria-labelledby="status-dashboard-title">
      <PanelHeader eyebrow="Status dashboard" title="Screening Operations Status" badge="Live pilot" badgeTone="secure" />
      <div className="status-dashboard-grid">
        <div className="status-chart-card throughput-chart">
          <div>
            <strong>Weekly screening throughput</strong>
            <span>Uploads, analyses, and doctor approvals</span>
          </div>
          <svg viewBox="0 0 520 220" role="img" aria-label="Weekly screening throughput area chart">
            <defs>
              <linearGradient id="throughputFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#39bf7f" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#39bf7f" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[48, 88, 128, 168].map((y) => (
              <line className="status-grid-line" x1="42" y1={y} x2="492" y2={y} key={y} />
            ))}
            <path className="status-area" d="M42 170 C92 150 114 122 158 132 C204 142 222 82 274 96 C326 110 350 66 402 72 C444 76 462 52 492 44 L492 190 L42 190 Z" />
            <path className="status-line upload" d="M42 170 C92 150 114 122 158 132 C204 142 222 82 274 96 C326 110 350 66 402 72 C444 76 462 52 492 44" />
            <path className="status-line approval" d="M42 184 C96 176 132 150 176 154 C220 158 236 118 284 124 C332 130 360 98 410 104 C452 108 468 86 492 78" />
            <g className="status-points">
              {[42, 158, 274, 402, 492].map((x, index) => (
                <circle cx={x} cy={[170, 132, 96, 72, 44][index]} r="4" key={x} />
              ))}
            </g>
          </svg>
          <div className="chart-legend inline">
            <span><i className="dot green-dot" /> Uploads analyzed</span>
            <span><i className="dot blue-dot" /> Doctor approvals</span>
          </div>
        </div>

        <div className="status-chart-card stacked-risk-chart">
          <div>
            <strong>Risk mix by clinic day</strong>
            <span>Low, moderate, and high screening buckets</span>
          </div>
          <div className="stacked-bars" aria-label="Risk mix stacked bar chart">
            {[
              ["Mon", 58, 28, 14],
              ["Tue", 64, 23, 13],
              ["Wed", 55, 30, 15],
              ["Thu", 61, 26, 13],
              ["Fri", 49, 34, 17],
            ].map(([day, low, moderate, high]) => (
              <span key={day}>
                <em>{day}</em>
                <i style={{ "--low": `${low}%`, "--moderate": `${moderate}%`, "--high": `${high}%` } as CSSProperties} />
              </span>
            ))}
          </div>
          <div className="chart-legend inline">
            <span><i className="dot low-dot" /> Low</span>
            <span><i className="dot moderate-dot" /> Moderate</span>
            <span><i className="dot high-dot" /> High</span>
          </div>
        </div>

        <div className="status-chart-card status-bars-card">
          <div>
            <strong>Current queue status</strong>
            <span>Operational blockers and ready states</span>
          </div>
          <div className="queue-bars" aria-label="Current queue status bar chart">
            {[
              ["Quality passed", 96, "good"],
              ["Doctor pending", 42, "warn"],
              ["Reports ready", 74, "good"],
              ["Rescan needed", 9, "risk"],
            ].map(([label, value, tone]) => (
              <span className={`queue-bar ${tone}`} key={label}>
                <strong>{label}</strong>
                <i style={{ "--bar": `${value}%` } as CSSProperties} />
                <em>{value}%</em>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskDonut() {
  return (
    <div className="risk-donut-wrap">
      <div className="donut-chart" aria-label="Risk level distribution">
        <strong>1,248</strong>
        <span>Total</span>
      </div>
      <div className="donut-legend">
        <span><i className="dot high-dot" /> High Risk <strong>142 (11.4%)</strong></span>
        <span><i className="dot moderate-dot" /> Moderate Risk <strong>326 (26.1%)</strong></span>
        <span><i className="dot low-dot" /> Low Risk <strong>780 (62.5%)</strong></span>
      </div>
    </div>
  );
}

function AiInsightCard() {
  return (
    <section className="panel ai-insight-card" aria-labelledby="ai-insight-title">
      <PanelHeader eyebrow="Clinical guardrails" title="Screening Safety" badge="Updated" badgeTone="secure" />
      <p>
        Thermoeye locks outputs to Normal, Alzheimer-risk, or Quality-blocked screening language. It does not release reports
        until image quality, de-identification, ruleset output, and doctor approval are complete.
      </p>
      <div className="insight-benefits">
        <span>Decision support</span>
        <span>Doctor approval</span>
        <span>Audit-ready</span>
      </div>
    </section>
  );
}
