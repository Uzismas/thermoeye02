import { clinicalEvidenceSources, clinicalModelVersion, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import type { CaseRecord, ReviewRecord, ViewId } from "../types";
import { riskTone } from "../utils";
import { HeatmapSvg, SegmentationSvg } from "./scan-visuals";
import { PanelHeader, SectionHeading } from "./shared";

export function ReportView({
  selectedCase,
  selectedReview,
  onBack,
  onDownload,
}: {
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  onBack: (viewId: ViewId) => void;
  onDownload: () => void;
}) {
  const canDownload = selectedReview.decision === "Approved for release";
  const classification = getCaseClassification(selectedCase);
  const metrics = selectedCase.analysisMetrics;

  return (
    <section className="view active" aria-labelledby="report-title">
      <SectionHeading
        eyebrow="Report release"
        title="Clinical report preview"
        note="This preview is locked to screening support language and includes model, threshold, and review status."
      />

      <div className="report-grid">
        <article className="panel report-document" aria-labelledby="report-document-title">
          <div className="report-header">
            <div>
              <p className="eyebrow">Thermoeye screening report</p>
              <h2 id="report-document-title">{selectedCase.id}</h2>
            </div>
            <span className={`risk-chip ${riskTone[selectedCase.riskLevel]}`}>
              {classification.kind === "quality_blocked" ? "Blocked" : `${getClinicalResultLabel(classification.kind)} ${selectedCase.riskScore}`}
            </span>
          </div>

          <div className="report-summary">
            <dl>
              <div>
                <dt>Patient context</dt>
                <dd>{selectedCase.context}</dd>
              </div>
              <div>
                <dt>Scan</dt>
                <dd>
                  {selectedCase.scanType} · {selectedCase.eye} · {selectedCase.qualityLabel}
                </dd>
              </div>
              <div>
                <dt>Screening result</dt>
                <dd>{getClinicalResultLabel(classification.kind)}</dd>
              </div>
              <div>
                <dt>AI confidence</dt>
                <dd>{selectedCase.confidence.replace("Confidence ", "")}</dd>
              </div>
              <div>
                <dt>VD / FAZ proxy</dt>
                <dd>
                  {metrics ? `${metrics.vesselDensity}% / ${metrics.fazRiskProxy}%` : "Reference-derived"}
                </dd>
              </div>
              <div>
                <dt>Doctor review</dt>
                <dd>{selectedReview.decision}</dd>
              </div>
              <div>
                <dt>Reviewer</dt>
                <dd>{selectedReview.reviewer}</dd>
              </div>
              <div>
                <dt>Follow-up</dt>
                <dd>{selectedReview.followUpWindow}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{selectedReview.updatedAt}</dd>
              </div>
            </dl>
          </div>

          <div className="report-visuals">
            <ReportScanFrame
              alt={`Report source scan for ${selectedCase.uploadedFileName ?? selectedCase.id}`}
              label="Uploaded reference"
              mode="original"
              src={selectedCase.uploadedImageUrl}
            />
            <ReportScanFrame
              alt={`Report risk overlay for ${selectedCase.uploadedFileName ?? selectedCase.id}`}
              label={classification.kind === "normal" ? "Low attention overlay" : "Risk attention overlay"}
              mode="heatmap"
              src={selectedCase.uploadedImageUrl}
            />
          </div>

          <section className="report-section">
            <h3>Screening interpretation</h3>
            <p>{classification.finding}</p>
            <div className="report-evidence-list">
              {classification.evidence.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="report-section">
            <h3>Clinical recommendation</h3>
            <p>{classification.recommendation}</p>
          </section>

          <section className="report-section">
            <h3>Doctor note</h3>
            <p>{selectedReview.note}</p>
          </section>

          <section className="report-section">
            <h3>Release controls</h3>
            <ul>
              <li>Model: {clinicalModelVersion}</li>
              <li>Threshold: 2026.05</li>
              <li>Purpose: screening support only</li>
              <li>Raw identifiers: de-identified before analysis</li>
              <li>Report wording: locked to normal, Alzheimer-risk, or quality-blocked screening outcomes</li>
            </ul>
          </section>

          <section className="report-section">
            <h3>Evidence references</h3>
            <ul>
              {clinicalEvidenceSources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <section className="panel report-actions" aria-labelledby="report-actions-title">
          <PanelHeader eyebrow="Controls" title="Report actions" badge="Audit logged" />
          <div className="checklist">
            <div className="check-item pass">
              <strong>Model version attached</strong>
              <span>{clinicalModelVersion}</span>
            </div>
            <div className="check-item pass">
              <strong>Threshold version attached</strong>
              <span>2026.05</span>
            </div>
            <div className="check-item pass">
              <strong>Screening language locked</strong>
              <span>{classification.kind === "quality_blocked" ? "Quality block only" : "Normal or Alzheimer-risk only"}</span>
            </div>
            <div className="check-item pass">
              <strong>Patient identifiers removed</strong>
              <span>Case code only in report preview</span>
            </div>
            <div className={canDownload ? "check-item pass" : "check-item hold"}>
              <strong>Doctor approval</strong>
              <span>{canDownload ? "Ready for release" : "Report remains locked"}</span>
            </div>
          </div>

          <div className="actions-row vertical-actions">
            <button className="primary-button wide" type="button" onClick={onDownload} disabled={!canDownload}>
              Download PDF mock
            </button>
            <button className="ghost-button wide" type="button" onClick={() => onBack("dashboard")}>
              Back to case review
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function ReportScanFrame({
  alt,
  label,
  mode,
  src,
}: {
  alt: string;
  label: string;
  mode: "heatmap" | "original";
  src?: string;
}) {
  return (
    <figure className="report-scan-frame">
      <div className={`retina-scan report-scan uploaded-scan-frame ${mode}`}>
        {src ? (
          // Blob/object URLs from local demo uploads cannot go through next/image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={alt} src={src} />
        ) : mode === "heatmap" ? (
          <HeatmapSvg />
        ) : (
          <SegmentationSvg />
        )}
        {mode === "heatmap" && src ? <span className="scan-hotspot primary" aria-hidden="true" /> : null}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
