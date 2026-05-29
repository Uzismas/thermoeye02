import type { CSSProperties } from "react";
import { researchEvidence } from "../mock-data";
import { PanelHeader, SectionHeading } from "./shared";

export function InsightsView() {
  return (
    <section className="view active" aria-labelledby="insights-title">
      <SectionHeading
        eyebrow="Exploring trends, demographics and key metrics from analyzed OCTA scans"
        title="Data Insights"
        note="Aggregates are de-identified and scoped to selected hospitals."
        actions={<button className="ghost-button" type="button">Export Insights Report</button>}
      />

      <section className="ops-hero insight-ops" aria-labelledby="insight-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Population screening intelligence</p>
          <h2 id="insight-ops-title">Risk patterns across partner hospitals</h2>
          <p>
            Track screening access, high-risk concentration, and scan quality without exposing patient identity.
          </p>
        </div>
        <div className="ops-status-grid" aria-label="Insight highlights">
          <span>
            <strong>11.3%</strong>
            <em>High-risk share</em>
            <small>+1.2 pts vs previous period</small>
          </span>
          <span>
            <strong>70-79</strong>
            <em>Highest average risk group</em>
            <small>0.47 mean risk score</small>
          </span>
          <span>
            <strong>DCP</strong>
            <em>Top contributing factor</em>
            <small>0.82 importance weight</small>
          </span>
          <span>
            <strong>6</strong>
            <em>Hospitals contributing</em>
            <small>All aggregates de-identified</small>
          </span>
        </div>
      </section>

      <div className="filter-strip" aria-label="Insight filters">
        <label><span>Date Range</span><select defaultValue="1 Apr 2025 - 12 May 2025" aria-label="Date range"><option>1 Apr 2025 - 12 May 2025</option></select></label>
        <label><span>Hospital</span><select defaultValue="All Hospitals" aria-label="Hospital filter"><option>All Hospitals</option><option>Bangkok Neurology Hospital</option></select></label>
        <label><span>Scan Type</span><select defaultValue="All Scan Types" aria-label="Scan type filter"><option>All Scan Types</option><option>OCTA</option><option>OCT</option></select></label>
        <label><span>Age Group</span><select defaultValue="All Age Groups" aria-label="Age group filter"><option>All Age Groups</option><option>60+</option><option>70+</option></select></label>
      </div>

      <div className="metrics-grid six">
        <InsightMetric label="Total Analyzed Scans" value="28,541" caption="+12.5% vs previous period" tone="blue" />
        <InsightMetric label="High Risk Cases" value="3,214" caption="+11.3% vs previous period" tone="green" />
        <InsightMetric label="Average Risk Score" value="0.38" caption="+0.02 vs previous period" tone="orange" />
        <InsightMetric label="Partner Hospitals" value="6" caption="All active in this period" tone="blue" />
        <InsightMetric label="Unique Patients" value="24,817" caption="+7.4% vs previous period" tone="green" />
      </div>

      <div className="insight-dashboard-grid">
        <section className="panel wide-panel research-evidence-panel" aria-labelledby="research-evidence-title">
          <PanelHeader eyebrow="Clinical evidence" title="Research evidence board" badge="External sources" badgeTone="secure" />
          <div className="evidence-lead">
            <strong>Retina-to-brain screening rationale</strong>
            <p>
              Demo findings are framed as clinical decision support. These sources support the research narrative around OCT/OCTA,
              retinal vascular biomarkers, and Alzheimer&apos;s screening, while the product still requires model validation before clinical use.
            </p>
          </div>
          <div className="evidence-grid">
            {researchEvidence.map((item) => (
              <article className="evidence-card" key={item.url}>
                <span>{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Open source
                </a>
                <small>{item.source}</small>
              </article>
            ))}
          </div>
          <p className="evidence-rights-note">
            ResearchGate figures are linked as external references because image reuse rights must be confirmed before copying them into product assets.
          </p>
        </section>

        <section className="panel wide-panel" aria-labelledby="risk-over-time-title">
          <PanelHeader eyebrow="Risk Level Distribution Over Time" title="Risk Level Distribution Over Time" badge="Daily" />
          <div className="stacked-area" aria-label="Risk level distribution over time">
            <span className="chart-axis top">Higher risk share</span>
            <span className="chart-axis bottom">Apr 1 - May 12</span>
            <div className="area high" />
            <div className="area moderate" />
            <div className="area low" />
          </div>
          <div className="chart-legend">
            <span><i className="dot low-dot" /> Low Risk</span>
            <span><i className="dot moderate-dot" /> Moderate Risk</span>
            <span><i className="dot high-dot" /> High Risk</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="risk-all-time-title">
          <PanelHeader eyebrow="Risk Level Distribution" title="Risk Level Distribution (All Time)" badge="28,541" />
          <div className="donut-chart large insight-donut" aria-label="All time risk distribution">
            <strong>28,541</strong>
            <span>Total</span>
          </div>
          <div className="donut-legend compact">
            <span><i className="dot high-dot" /> High Risk <strong>3,214 (11.3%)</strong></span>
            <span><i className="dot moderate-dot" /> Moderate Risk <strong>7,856 (27.6%)</strong></span>
            <span><i className="dot low-dot" /> Low Risk <strong>17,471 (61.1%)</strong></span>
          </div>
        </section>

        <section className="panel wide-panel age-panel" aria-labelledby="age-score-title">
          <PanelHeader eyebrow="Average Risk Score by Age Group" title="Average Risk Score by Age Group" badge="All ages" />
          <div className="age-bars" aria-label="Average risk score by age group">
            {[
              ["< 50", "16%", "0.10"],
              ["50-59", "30%", "0.21"],
              ["60-69", "44%", "0.34"],
              ["70-79", "58%", "0.47"],
              ["80+", "72%", "0.61"],
            ].map(([label, height, value]) => (
              <span style={{ "--h": height } as CSSProperties} key={label}>
                <strong>{value}</strong>
                <i />
                <em>{label}</em>
              </span>
            ))}
          </div>
        </section>

        <section className="panel insight-summary" aria-labelledby="insight-summary-title">
          <PanelHeader eyebrow="Insight Summary" title="Insight Summary" badge="Review signal" badgeTone="secure" />
          <div className="summary-callout">
            <strong>Clinical operations signal</strong>
            <p>High risk rate increased by 1.2% compared to the previous period. Vessel density in DCP shows the strongest positive correlation with risk score.</p>
          </div>
        </section>
      </div>

      <div className="insight-dashboard-grid bottom">
        <section className="panel wide-panel" aria-labelledby="hospital-comparison-title">
          <PanelHeader eyebrow="Hospital Performance Comparison" title="Hospital Performance Comparison" badge="View full comparison" />
          <table className="compact-table">
            <thead>
              <tr><th>Hospital</th><th>Total Scans</th><th>High Risk Avg</th><th>Average Risk Score</th><th>Trend</th></tr>
            </thead>
            <tbody>
              {[
                ["Bangkok Neurology Hospital", "8,723", "12.4%", "0.41", "up"],
                ["Chiang Mai Memory Hospital", "6,125", "10.7%", "0.36", "flat"],
                ["Siriraj Hospital", "5,090", "11.8%", "0.39", "up"],
                ["Bumrungrad Hospital", "4,521", "8.2%", "0.34", "down"],
                ["Phuket International Hospital", "2,987", "12.1%", "0.40", "flat"],
              ].map(([hospital, scans, high, score, trend]) => (
                <tr key={hospital}>
                  <td>{hospital}</td><td>{scans}</td><td>{high}</td><td>{score}</td><td><span className={`mini-trend ${trend}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="scan-type-title">
          <PanelHeader eyebrow="Scan Volume by Scan Type" title="Scan Volume by Scan Type" badge="View scan breakdown" />
          <div className="donut-chart large scan-donut" aria-label="Scan type distribution"><strong>28,541</strong><span>Total</span></div>
          <div className="donut-legend compact">
            <span><i className="dot blue-dot" /> OCTA - Macula (3x3 mm) <strong>21,673</strong></span>
            <span><i className="dot purple-dot" /> OCTA - Wide-field <strong>4,215</strong></span>
            <span><i className="dot amber-dot" /> OCT - 3D <strong>2,653</strong></span>
          </div>
        </section>

        <section className="panel" aria-labelledby="factors-title">
          <PanelHeader eyebrow="Top Contributing Factors" title="Top Contributing Factors" badge="View all factors" />
          <div className="factor-bars">
            <Factor label="Vessel Density (DCP)" value="0.82" />
            <Factor label="Vessel Density (SCP)" value="0.64" />
            <Factor label="FAZ Area" value="0.57" />
            <Factor label="Vessel Tortuosity" value="0.49" />
            <Factor label="Fractal Dimension" value="0.38" />
            <Factor label="Perfusion Density" value="0.21" />
          </div>
        </section>
      </div>

    </section>
  );
}

function InsightMetric({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
      <span className="sparkline" aria-hidden="true" />
    </article>
  );
}

function Factor({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ "--bar": `${Number(value) * 100}%` } as CSSProperties}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
