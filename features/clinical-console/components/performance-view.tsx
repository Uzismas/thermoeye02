import type { CSSProperties } from "react";
import { clinicalModelVersion } from "../clinical-analysis";
import { PanelHeader, SectionHeading } from "./shared";

export function PerformanceView() {
  return (
    <section className="view active" aria-labelledby="performance-title">
      <SectionHeading
        eyebrow="Monitor, evaluate and improve AI model performance"
        title="Model Performance"
        note="Clinical oversight metrics for the current validation window."
        actions={<button className="ghost-button" type="button">Export Report</button>}
      />

      <section className="ops-hero performance-ops" aria-labelledby="performance-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Model readiness board</p>
          <h2 id="performance-ops-title">Literature ruleset is locked for reviewed screening</h2>
          <p>
            Validation metrics are inside the release band. Drift is monitored, and report release remains gated by doctor approval.
          </p>
        </div>
        <div className="ops-status-grid" aria-label="Model readiness highlights">
          <span>
            <strong>0.923</strong>
            <em>AUC validation</em>
            <small>Above 0.90 release threshold</small>
          </span>
          <span>
            <strong>0.12</strong>
            <em>Population stability index</em>
            <small>No significant drift</small>
          </span>
          <span>
            <strong>132</strong>
            <em>Review mismatches</em>
            <small>Queued for error analysis</small>
          </span>
          <span>
            <strong>57d</strong>
            <em>Next retraining window</em>
            <small>12 Jul 2025 planned</small>
          </span>
        </div>
      </section>

      <div className="filter-strip" aria-label="Performance filters">
        <label><span>Model Version</span><select defaultValue={clinicalModelVersion} aria-label="Model version"><option>{clinicalModelVersion}</option></select></label>
        <label><span>Time Range</span><select defaultValue="1 Apr 2025 - 12 May 2025" aria-label="Time range"><option>1 Apr 2025 - 12 May 2025</option></select></label>
        <label><span>Data Source</span><select defaultValue="All Partner Hospitals" aria-label="Data source"><option>All Partner Hospitals</option></select></label>
      </div>

      <div className="metrics-grid six model-metrics">
        <ModelMetric label="AUC" value="0.923" caption="+1.8% vs previous" tone="purple" />
        <ModelMetric label="Accuracy" value="89.1%" caption="+1.6% vs previous" tone="green" />
        <ModelMetric label="Sensitivity (Recall)" value="88.7%" caption="+2.3% vs previous" tone="green" />
        <ModelMetric label="Specificity" value="89.5%" caption="+1.2% vs previous" tone="orange" />
        <ModelMetric label="F1 Score" value="0.886" caption="+0.017 vs previous" tone="purple" />
        <ModelMetric label="PPV (Precision)" value="89.3%" caption="+1.5% vs previous" tone="green" />
      </div>

      <div className="performance-dashboard-grid">
        <section className="panel" aria-labelledby="roc-title">
          <PanelHeader eyebrow="ROC Curve" title="ROC Curve" badge="View details" />
          <div className="chart-shell">
            <span className="chart-axis top">True positive rate</span>
            <span className="chart-axis bottom">False positive rate</span>
            <svg className="roc-chart" viewBox="0 0 420 260" role="img" aria-label="ROC curve showing AUC 0.923">
            <line x1="46" y1="218" x2="382" y2="218" />
            <line x1="46" y1="218" x2="46" y2="30" />
            <path d="M48 218 C64 148 92 91 145 61 C205 28 291 26 382 32" />
            <path className="baseline" d="M48 218 L382 32" />
            </svg>
          </div>
        </section>

        <section className="panel" aria-labelledby="matrix-title">
          <PanelHeader eyebrow="Confusion Matrix" title="Confusion Matrix" badge="View details" />
          <div className="matrix" aria-label="Confusion matrix placeholder">
            <span />
            <strong>Pred low</strong>
            <strong>Pred high</strong>
            <strong>Actual low</strong>
            <span>1,163</span>
            <span>53</span>
            <strong>Actual high</strong>
            <span>79</span>
            <span>412</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="calibration-title">
          <PanelHeader eyebrow="Calibration Plot" title="Calibration Plot" badge="View details" />
          <div className="chart-shell">
            <span className="chart-axis top">Observed risk</span>
            <span className="chart-axis bottom">Predicted risk</span>
            <svg className="calibration-chart" viewBox="0 0 420 260" role="img" aria-label="Calibration plot for predicted and observed risk">
              <line x1="45" y1="218" x2="382" y2="218" />
              <line x1="45" y1="218" x2="45" y2="30" />
              <path className="perfect" d="M48 218 L382 34" />
              <path d="M48 210 C102 178 145 146 192 113 C247 77 310 56 382 38" />
            </svg>
          </div>
        </section>
      </div>

      <div className="performance-dashboard-grid lower">
        <section className="panel" aria-labelledby="trend-title">
          <PanelHeader eyebrow="Performance Trend" title="Performance Trend" badge="View full history" />
          <div className="multi-line-chart" aria-label="Model performance trend">
            <span className="chart-axis top">Validation metrics</span>
            <span className="chart-axis bottom">Last 6 model checks</span>
            <svg className="trend-chart" viewBox="0 0 520 240" role="img" aria-label="AUC, accuracy, sensitivity, and specificity over the last six model checks">
              <line className="trend-axis" x1="42" y1="202" x2="486" y2="202" />
              <line className="trend-axis" x1="42" y1="34" x2="42" y2="202" />
              {[62, 102, 142, 182].map((y) => (
                <line className="trend-grid" x1="42" y1={y} x2="486" y2={y} key={y} />
              ))}
              <path className="trend-line auc" d="M46 86 L130 80 L214 74 L298 70 L382 63 L482 58" />
              <path className="trend-line accuracy" d="M46 112 L130 108 L214 104 L298 96 L382 92 L482 88" />
              <path className="trend-line sensitivity" d="M46 124 L130 116 L214 110 L298 102 L382 98 L482 93" />
              <path className="trend-line specificity" d="M46 118 L130 113 L214 106 L298 101 L382 94 L482 90" />
              <g className="trend-points auc">
                <circle cx="46" cy="86" r="4" /><circle cx="214" cy="74" r="4" /><circle cx="382" cy="63" r="4" /><circle cx="482" cy="58" r="4" />
              </g>
              <g className="trend-points accuracy">
                <circle cx="46" cy="112" r="4" /><circle cx="214" cy="104" r="4" /><circle cx="382" cy="92" r="4" /><circle cx="482" cy="88" r="4" />
              </g>
              <g className="trend-points sensitivity">
                <circle cx="46" cy="124" r="4" /><circle cx="214" cy="110" r="4" /><circle cx="382" cy="98" r="4" /><circle cx="482" cy="93" r="4" />
              </g>
              <g className="trend-points specificity">
                <circle cx="46" cy="118" r="4" /><circle cx="214" cy="106" r="4" /><circle cx="382" cy="94" r="4" /><circle cx="482" cy="90" r="4" />
              </g>
            </svg>
          </div>
          <div className="chart-legend">
            <span><i className="dot purple-dot" /> AUC</span>
            <span><i className="dot blue-dot" /> Accuracy</span>
            <span><i className="dot green-dot" /> Sensitivity</span>
            <span><i className="dot amber-dot" /> Specificity</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="drift-title">
          <PanelHeader eyebrow="Model Drift (PSI)" title="Model Drift (PSI)" badge="View details" />
          <div className="drift-gauge" style={{ "--gauge": "22%" } as CSSProperties}>
            <strong>0.12</strong>
            <span>No significant drift</span>
          </div>
          <div className="drift-scale"><span>No Drift</span><span>Warning</span><span>Severe Drift</span></div>
        </section>

        <section className="panel" aria-labelledby="importance-title">
          <PanelHeader eyebrow="Feature Importance" title="Feature Importance (Top 8)" badge="View details" />
          <div className="factor-bars">
            <Factor label="Vessel Density (DCP)" value="0.29" />
            <Factor label="Vessel Density (SCP)" value="0.21" />
            <Factor label="FAZ Area" value="0.14" />
            <Factor label="Vessel Tortuosity" value="0.11" />
            <Factor label="Fractal Dimension" value="0.08" />
            <Factor label="Perfusion Density" value="0.06" />
          </div>
        </section>
      </div>

      <section className="panel model-info-strip" aria-labelledby="model-info-title">
        <PanelHeader eyebrow="Model Information" title="Model Information" badge="Retrain Model Now" />
        <div>
          <span><strong>Algorithm</strong>Locked retinal-biomarker ruleset</span>
          <span><strong>Input</strong>OCTA SCP &amp; DCP images</span>
          <span><strong>Training Data</strong>12,492 images</span>
          <span><strong>Validation Data</strong>4,125 images</span>
          <span><strong>Test Data</strong>3,214 images</span>
          <span><strong>Last Trained</strong>12 May 2025</span>
          <span><strong>Next Retraining</strong>12 Jul 2025</span>
        </div>
      </section>
    </section>
  );
}

function ModelMetric({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "purple" | "green" | "orange";
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="trend-up">{caption}</small>
      <span className="sparkline" aria-hidden="true" />
    </article>
  );
}

function Factor({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ "--bar": `${Number(value) * 320}%` } as CSSProperties}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
