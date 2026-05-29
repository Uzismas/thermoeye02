import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { clinicalEvidenceSources, clinicalModelVersion, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { researchEvidence } from "../mock-data";
import type { CaseRecord } from "../types";
import { PanelHeader, SectionHeading } from "./shared";

const referencePipelineImages = {
  original: "/research/pipeline/real-octa-original.jpg",
  segmentation: "/research/pipeline/real-octa-segmentation.jpg",
  density: "/research/pipeline/real-octa-density.jpg",
  heatmap: "/research/pipeline/real-octa-heatmap.jpg",
} as const;

export function AnalysisView({ selectedCase }: { selectedCase: CaseRecord }) {
  const riskDecimal = selectedCase.riskLevel === "blocked" ? "N/A" : (selectedCase.riskScore / 100).toFixed(2);
  const metrics = selectedCase.analysisMetrics;
  const classification = getCaseClassification(selectedCase);

  return (
    <section className="view active" aria-labelledby="analysis-title">
      <SectionHeading
        eyebrow="Back to Analysis Results"
        title="Analysis Result"
        note={`Scan ID: ${selectedCase.id.replace("TE", "SC")} · 12 May 2025 10:24 AM`}
        actions={(
          <>
            <button className="ghost-button" type="button">Download Report</button>
            <button className="primary-button" type="button">Share Report</button>
          </>
        )}
      />

      <div className="analysis-hero-grid">
        <section className="panel patient-overview" aria-labelledby="patient-overview-title">
          <PanelHeader eyebrow="Patient Overview" title="Patient Overview" badge="Edit" />
          <dl>
            <div><dt>Patient ID</dt><dd>{selectedCase.id.replace("TE", "PT")}</dd></div>
            <div><dt>Age / Gender</dt><dd>{selectedCase.age} / {selectedCase.sex === "F" ? "Female" : "Male"}</dd></div>
            <div><dt>Scan Type</dt><dd>{selectedCase.scanType} - Macula (3x3 mm)</dd></div>
            <div><dt>Referring Doctor</dt><dd>Dr. Nattapong</dd></div>
            <div><dt>Clinical Note</dt><dd>{selectedCase.uploadedFileName ? `Uploaded demo file: ${selectedCase.uploadedFileName}` : "Mild memory complaint, family history of Alzheimer's disease."}</dd></div>
          </dl>
        </section>

        <section className="panel ai-assessment" aria-labelledby="ai-risk-title">
          <PanelHeader eyebrow="AI Risk Assessment" title="AI Risk Assessment" badge="Completed" badgeTone="secure" />
          <div className="assessment-body">
            <div className="arc-gauge" style={{ "--gauge": `${selectedCase.riskScore}%` } as CSSProperties}>
              <strong>{riskDecimal}</strong>
              <span>{getClinicalResultLabel(classification.kind)}</span>
            </div>
            <div className="assessment-copy">
              <p>
                {classification.finding}
              </p>
              <strong>Recommendation</strong>
              <span>{classification.recommendation}</span>
              <div className="confidence-line"><i style={{ "--confidence": `${metrics?.confidenceScore ?? 88}%` } as CSSProperties} /></div>
              <small>Confidence Score {Math.round(metrics?.confidenceScore ?? 88)}%</small>
            </div>
          </div>
        </section>

        <section className="panel key-metrics" aria-labelledby="key-metrics-title">
          <PanelHeader eyebrow="Key Metrics" title="Key Metrics" badge="Visit full metrics" />
          <MetricLine label="Vessel Density Proxy" value={`${metrics?.vesselDensity ?? 28}%`} tone={(metrics?.vesselDensity ?? 28) < 45 ? "low" : "high"} />
          <MetricLine label="FAZ / Perfusion Risk Proxy" value={`${metrics?.fazRiskProxy ?? 48}%`} tone={(metrics?.fazRiskProxy ?? 48) >= 45 ? "high" : "low"} />
          <MetricLine label="Perfusion Density Proxy" value={`${metrics?.perfusionDensityProxy ?? 40}%`} tone={(metrics?.perfusionDensityProxy ?? 40) < 45 ? "low" : "high"} />
          <MetricLine label="Image Quality" value={`${Math.round(metrics?.qualityScore ?? 96)}%`} tone={(metrics?.qualityScore ?? 96) > 75 ? "high" : "low"} />
          <MetricLine label="Contrast Index" value={`${metrics?.contrast ?? 42}`} tone={(metrics?.contrast ?? 42) > 38 ? "high" : "low"} />
          <MetricLine label="Artifact Estimate" value={`${metrics?.artifactScore ?? 4}%`} tone={(metrics?.artifactScore ?? 4) > 25 ? "high" : "low"} />
        </section>
      </div>

      <section className="panel clinical-classification-panel" aria-labelledby="clinical-classification-title">
        <PanelHeader eyebrow="Locked clinical ruleset" title="Two-outcome screening result" badge={clinicalModelVersion} badgeTone="secure" />
        <div className="classification-grid">
          <div className={`classification-card ${classification.kind === "normal" ? "active" : ""}`}>
            <strong>Normal</strong>
            <span>Preserved vessel-density proxy and no elevated FAZ/perfusion-risk proxy.</span>
          </div>
          <div className={`classification-card ${classification.kind === "alzheimer_risk" ? "active risk" : ""}`}>
            <strong>Alzheimer risk</strong>
            <span>Reduced vessel-density proxy with FAZ/perfusion-risk deviation. Needs clinician correlation.</span>
          </div>
        </div>
        <div className="classification-evidence">
          {classification.evidence.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <p>
          This rule locks the report language to screening support. It does not diagnose Alzheimer&apos;s disease and should be interpreted with clinical history, cognitive screening, and physician review.
        </p>
      </section>

      <section className="panel octa-analysis" aria-labelledby="octa-title">
        <PanelHeader eyebrow="OCTA Analysis" title="Real medical OCTA evidence view" badge={selectedCase.uploadedImageUrl ? "Uploaded image analyzed" : "Clinical reference figures"} />
        <div className="medical-figure-grid">
          <figure className="medical-figure-card primary">
            <div className="scan-title">
              <h3>OCTA acquisition and vessel-density map</h3>
              <span>Superficial · deep · disc</span>
            </div>
            <Image
              alt="Real OCTA clinical figure showing superficial plexus, deep plexus, disc scan, zoning diagram, and vessel-density table"
              height={1527}
              src="/research/frontiers-octa-alzheimer-figure-1.jpg"
              width={1946}
            />
            <figcaption>
              Source: Frontiers in Aging Neuroscience, OCTA study figure, CC BY. Used as a real clinical research reference image.
            </figcaption>
          </figure>

          <figure className="medical-figure-card">
            <div className="scan-title">
              <h3>Deep and superficial vessel density</h3>
              <span>AD · MCI · NC</span>
            </div>
            <Image
              alt="Real bar chart comparing deep and superficial vessel density across Alzheimer disease, mild cognitive impairment, and normal control cohorts"
              height={1262}
              src="/research/frontiers-octa-alzheimer-figure-2.jpg"
              width={924}
            />
            <figcaption>
              Source: Frontiers in Aging Neuroscience. Grouped clinical vessel-density comparison for AD, MCI, and NC cohorts.
            </figcaption>
          </figure>

          <figure className="medical-figure-card">
            <div className="scan-title">
              <h3>Macular sector protocol</h3>
              <span>1 mm · 3 mm · 6 mm</span>
            </div>
            <Image
              alt="Real retinal sector protocol diagram showing fovea, inner ring, outer ring, and macular quadrants"
              height={812}
              src="/research/frontiers-retina-alzheimer-figure-1.jpg"
              width={1454}
            />
            <figcaption>
              Source: Frontiers in Aging Neuroscience. Macular regional measurement protocol used in retinal biomarker research.
            </figcaption>
          </figure>

          <figure className="medical-figure-card wide-short">
            <div className="scan-title">
              <h3>AD versus control sector signal</h3>
              <span>Retinal quadrant evidence</span>
            </div>
            <Image
              alt="Real retinal sector comparison figure showing significant regions for Alzheimer disease versus healthy control, MCI versus healthy control, and Alzheimer disease versus MCI"
              height={546}
              src="/research/frontiers-retina-alzheimer-figure-2.jpg"
              width={1904}
            />
            <figcaption>
              Source: Frontiers in Aging Neuroscience. Highlighted retinal regions associated with AD versus healthy control comparison.
            </figcaption>
          </figure>
        </div>
        <div className="research-source-strip" aria-label="Research source links">
          {researchEvidence.slice(0, 5).map((item) => (
            <a href={item.url} target="_blank" rel="noreferrer" key={item.url}>
              {item.source}
            </a>
          ))}
        </div>
      </section>

      <section className="panel octa-analysis" aria-labelledby="scan-workflow-title">
        <PanelHeader eyebrow="Scan workflow" title="Current case image pipeline" badge={selectedCase.uploadedImageUrl ? "Live demo image" : "Real OCTA reference"} />
        <div className="analysis-grid four">
          <ScanPanel title="Original Image (SCP)" label={selectedCase.qualityLabel}>
            {selectedCase.uploadedImageUrl ? (
              <UploadedScanImage alt={`Uploaded scan ${selectedCase.uploadedFileName ?? selectedCase.id}`} src={selectedCase.uploadedImageUrl} />
            ) : (
              <ReferenceScanImage
                alt="Real superficial capillary plexus OCTA reference image"
                src={referencePipelineImages.original}
              />
            )}
          </ScanPanel>
          <ScanPanel title="Vascular Segmentation" label="Demo vessel mask">
            {selectedCase.uploadedImageUrl ? (
              <UploadedScanImage alt="Demo segmentation overlay from uploaded scan" mode="segmentation" src={selectedCase.uploadedImageUrl} />
            ) : (
              <ReferenceScanImage
                alt="Demo vascular segmentation view derived from a real OCTA reference image"
                src={referencePipelineImages.segmentation}
              />
            )}
          </ScanPanel>
          <ScanPanel title="Vessel Density Map" label="Demo density overlay">
            {selectedCase.uploadedImageUrl ? (
              <UploadedScanImage alt="Demo vessel density map from uploaded scan" mode="density" src={selectedCase.uploadedImageUrl} />
            ) : (
              <ReferenceScanImage
                alt="Demo vessel density overlay derived from a real OCTA reference image"
                src={referencePipelineImages.density}
              />
            )}
          </ScanPanel>
          <ScanPanel title="AI Heatmap (Risk Region)" label={`${selectedCase.heatmap} demo`}>
            {selectedCase.uploadedImageUrl ? (
              <UploadedScanImage alt="Demo risk heatmap from uploaded scan" mode="heatmap" src={selectedCase.uploadedImageUrl} />
            ) : (
              <ReferenceScanImage
                alt="Demo AI heatmap overlay derived from a real OCTA reference image"
                src={referencePipelineImages.heatmap}
              />
            )}
          </ScanPanel>
        </div>
        <div className="pipeline-source-note">
          <p>
            Default images use cropped real OCTA reference material from Frontiers in Aging Neuroscience. Segmentation, density, and heatmap panels are demo overlays for workflow presentation.
          </p>
          <div className="source-link-row">
            {clinicalEvidenceSources.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                {source.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="analysis-footer-grid">
        <InfoPanel title="Data Source & Provenance" rows={[
          "Hospital: Bangkok Neurology Hospital",
          selectedCase.uploadedFileName ? `File: ${selectedCase.uploadedFileName}` : "Device: Optovue AngioVue",
          metrics ? `Resolution: ${metrics.imageWidth} x ${metrics.imageHeight}` : "Data ID: DS-240512-001",
        ]} />
        <InfoPanel title="Data Privacy & Usage" rows={["De-identified: Yes", "Consent verified: Yes", "Retention: 10 years"]} />
        <InfoPanel title="Quality Control" rows={[
          `Image quality: ${Math.round(metrics?.qualityScore ?? 96)}%`,
          `Focus index: ${metrics?.sharpness ?? "Good"}`,
          metrics ? `Demo engine: ${metrics.demoEngineVersion}` : "Projection artifacts: None",
        ]} />
        <section className="panel action-stack" aria-labelledby="analysis-actions-title">
          <PanelHeader eyebrow="Actions" title="Actions" badge="Audit logged" />
          <button className="ghost-button wide" type="button">Add to Patient Record</button>
          <button className="ghost-button wide" type="button">Request Second Review</button>
          <button className="ghost-button wide" type="button">Export DICOM</button>
          <button className="danger-button wide" type="button">Delete Scan</button>
        </section>
      </div>
    </section>
  );
}

function UploadedScanImage({
  alt,
  mode = "original",
  src,
}: {
  alt: string;
  mode?: "density" | "heatmap" | "original" | "segmentation";
  src: string;
}) {
  return (
    <div className={`uploaded-scan-frame ${mode}`}>
      {/* Blob/object URLs from local demo uploads cannot go through next/image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} src={src} />
      {mode !== "original" ? <span className="scan-overlay-grid" aria-hidden="true" /> : null}
      {mode === "heatmap" ? <span className="scan-hotspot primary" aria-hidden="true" /> : null}
      {mode === "heatmap" ? <span className="scan-hotspot secondary" aria-hidden="true" /> : null}
    </div>
  );
}

function ReferenceScanImage({ alt, src }: { alt: string; src: string }) {
  return (
    <div className="reference-scan-frame">
      <Image
        alt={alt}
        className="reference-scan-image"
        fill
        sizes="(max-width: 700px) 100vw, (max-width: 1280px) 50vw, 25vw"
        src={src}
      />
    </div>
  );
}

function ScanPanel({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <section className="scan-panel" aria-label={title}>
      <div className="scan-title">
        <h3>{title}</h3>
        <span>{label}</span>
      </div>
      <div className="retina-scan" role="img" aria-label={`${title.toLowerCase()} preview`}>
        {children}
      </div>
    </section>
  );
}

function MetricLine({ label, value, tone }: { label: string; value: string; tone: "low" | "high" }) {
  return (
    <div className="metric-line">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>{tone === "high" ? "High" : "Low"}</em>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="panel compact-panel" aria-label={title}>
      <PanelHeader eyebrow={title} title={title} badge="View details" />
      <div className="info-list">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
    </section>
  );
}
