import type { CSSProperties } from "react";
import type { AuditEvent } from "../types";
import { clinicalModelVersion } from "../clinical-analysis";
import { PanelHeader, SectionHeading } from "./shared";

export function GovernanceView({ auditEvents }: { auditEvents: AuditEvent[] }) {
  return (
    <section className="view active" aria-labelledby="governance-title">
      <SectionHeading
        eyebrow="Manage data lifecycle, privacy, and model training"
        title="Data Management"
        note="The platform is the processor. Hospitals remain the data owners."
      />

      <section className="ops-hero governance-ops" aria-labelledby="governance-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Privacy and data operations</p>
          <h2 id="governance-ops-title">Every scan is traceable from upload to model use</h2>
          <p>
            Keep raw files quarantined, remove direct identifiers, enforce consent purpose, and audit every export or model-training use.
          </p>
        </div>
        <div className="ops-status-grid" aria-label="Governance highlights">
          <span>
            <strong>100%</strong>
            <em>De-ID required</em>
            <small>Before analysis or training</small>
          </span>
          <span>
            <strong>24</strong>
            <em>Exports this month</em>
            <small>All logged with user and purpose</small>
          </span>
          <span>
            <strong>91.2%</strong>
            <em>Quality pass rate</em>
            <small>Failed scans blocked from AI</small>
          </span>
          <span>
            <strong>2.3%</strong>
            <em>Metadata remediation</em>
            <small>Incomplete fields queued</small>
          </span>
        </div>
      </section>

      <div className="tab-strip" aria-label="Data management sections">
        {["Overview", "Data Sources", "De-identification", "Consent Management", "Data Usage Log", "Model Training"].map((item, index) => (
          <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
        ))}
      </div>

      <div className="workflow-strip governance-flow" aria-label="Data governance workflow">
        {[
          ["Raw upload", "Encrypted quarantine", "done"],
          ["Consent", "Screening + research scoped", "done"],
          ["De-ID", "Direct PHI removed", "done"],
          ["Quality gate", "Artifacts blocked", "active"],
          ["AI analysis", "Doctor-review only", "pending"],
          ["Audit log", "Append-only events", "done"],
        ].map(([label, detail, state]) => (
          <span className="workflow-step" data-state={state} key={label}>
            <strong>{label}</strong>
            <small>{detail}</small>
          </span>
        ))}
      </div>

      <div className="governance-dashboard-grid">
        <section className="panel" aria-labelledby="data-overview-title">
          <PanelHeader eyebrow="Data Overview" title="Data Overview" badge="View details" />
          <div className="donut-chart large data-donut" aria-label="Data overview distribution"><strong>28,541</strong><span>Total records</span></div>
          <div className="donut-legend compact">
            <span><i className="dot blue-dot" /> Training Set <strong>18,732 (65.7%)</strong></span>
            <span><i className="dot green-dot" /> Validation Set <strong>4,125 (14.5%)</strong></span>
            <span><i className="dot amber-dot" /> Test Set <strong>3,214 (11.3%)</strong></span>
            <span><i className="dot purple-dot" /> External Set <strong>2,470 (8.6%)</strong></span>
          </div>
        </section>

        <section className="panel" aria-labelledby="data-quality-title">
          <PanelHeader eyebrow="Data Quality Summary" title="Data Quality Summary" badge="Fresh" />
          <div className="quality-list">
            <Quality label="Image Passed Quality Check" value="91.2%" />
            <Quality label="Average Image Quality Score" value="0.87 / 1.00" />
            <Quality label="Duplicate Rate" value="1.8%" />
            <Quality label="Incomplete Metadata" value="2.3%" />
          </div>
          <div className="secure-note">All data are de-identified and compliant with PDPA &amp; HIPAA standards.</div>
        </section>

        <section className="panel wide-panel" aria-labelledby="growth-title">
          <PanelHeader eyebrow="Data Growth (All Time)" title="Data Growth (All Time)" badge="All sources" />
          <div className="growth-chart" aria-label="Data growth over time">
            <span className="chart-axis top">Cumulative de-identified records</span>
            <span className="chart-axis bottom">Jan 2024 - May 2025</span>
            <i />
            <strong>28,541<br /><span>May 2025</span></strong>
          </div>
        </section>
      </div>

      <div className="governance-dashboard-grid lower">
        <section className="panel wide-panel" aria-labelledby="ingestion-title">
          <PanelHeader eyebrow="Recent Data Ingestion" title="Recent Data Ingestion" badge="View all ingestion history" />
          <table className="compact-table">
            <thead>
              <tr><th>Source Hospital</th><th>Data Type</th><th>Records</th><th>Ingested At</th><th>Status</th><th>Quality Score</th><th>Action</th></tr>
            </thead>
            <tbody>
              {[
                ["Bangkok Neurology Hospital", "OCTA image", "142", "12 May 2025 14:20", "Completed", "0.87", "View details"],
                ["Chiang Mai Memory Hospital", "OCTA image", "416", "12 May 2025 11:05", "Completed", "0.93", "View details"],
                ["Siriraj Hospital", "OCTA image", "311", "11 May 2025 19:22", "Completed", "0.88", "View details"],
                ["Bumrungrad Hospital", "OCTA image", "79", "10 May 2025 08:44", "Queued", "0.78", "View details"],
              ].map(([hospital, type, records, ingested, status, quality, action]) => (
                <tr key={`${hospital}-${records}`}>
                  <td>{hospital}</td><td>{type}</td><td>{records}</td><td>{ingested}</td>
                  <td><span className={`status-pill ${status === "Queued" ? "pending" : ""}`}>{status}</span></td>
                  <td>{quality}</td><td><button className="link-button" type="button">{action}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="deid-title">
          <PanelHeader eyebrow="De-identification Process" title="De-identification Process" badge="Automated" />
          <div className="deid-flow">
            {["Raw Data Received", "PHI Detected", "Data Removed", "ID Replacement", "De-identified Data"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="phi-table">
            <span>Patient ID</span><strong>Hash-based random ID</strong>
            <span>Name</span><strong>Case ID replacement</strong>
            <span>Phone</span><strong>Removed</strong>
            <span>Email</span><strong>Removed</strong>
          </div>
        </section>
      </div>

      <div className="governance-dashboard-grid footer">
        <section className="panel" aria-labelledby="training-title">
          <PanelHeader eyebrow="Model Training Overview" title="Model Training Overview" badge="View all versions" />
          <div className="training-overview">
            <strong>{clinicalModelVersion}</strong>
            <span>AUC 0.923</span>
            <span>Accuracy 89.1%</span>
            <span>Sensitivity 88.7%</span>
            <span>Specificity 89.5%</span>
          </div>
          <div className="training-splits">
            <span><strong>Training Set</strong>18,732 images</span>
            <span><strong>Validation Data</strong>4,125 images</span>
            <span><strong>Test Set</strong>3,214 images</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="usage-title">
          <PanelHeader eyebrow="Data Usage Summary" title="Data Usage Summary" badge="This month" />
          <div className="usage-list">
            <Usage label="Total Analyses Performed" value="1,248" />
            <Usage label="Reports Generated" value="1,102" />
            <Usage label="Data Exported" value="24" />
            <Usage label="Researchers Access" value="7" />
            <Usage label="Model Retraining" value="1" />
          </div>
        </section>

        <section className="panel" aria-labelledby="storage-title">
          <PanelHeader eyebrow="Storage & Infrastructure" title="Storage & Infrastructure" badge="All systems operational" badgeTone="secure" />
          <div className="storage-gauge" style={{ "--gauge": "67%" } as CSSProperties}><strong>67%</strong><span>Used</span></div>
          <div className="usage-list">
            <Usage label="Used" value="1.34 TB" />
            <Usage label="Total" value="2.00 TB" />
          </div>
        </section>
      </div>

      <section className="panel audit-panel" aria-labelledby="audit-title">
        <PanelHeader eyebrow="Data Usage Log" title="Recent security events" badge="Append-only" />
        <ul className="audit-log">
          {auditEvents.map((event, index) => (
            <li key={`${event.time}-${event.message}-${index}`}>
              <strong>{event.time}</strong>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function Quality({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function Usage({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}
      <strong>{value}</strong>
    </span>
  );
}
