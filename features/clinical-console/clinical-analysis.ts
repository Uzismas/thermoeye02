import type { BaselineAnalysisMetrics, CaseRecord, ClinicalClassification, RiskLevel } from "./types";

export const clinicalEvidenceSources = [
  {
    label: "ResearchGate OCTA brain-disorder figure",
    url: "https://www.researchgate.net/figure/Retinal-changes-in-brain-disorders-Optical-coherence-tomography-angiography-OCT-A_fig3_382473153",
  },
  {
    label: "ResearchGate AD retinovascular figure",
    url: "https://www.researchgate.net/figure/Retinovascular-changes-in-AD-patients-This-Image-shows-the-differences-between-the_fig2_370356486",
  },
  {
    label: "Dementia Australia retinal imaging research sheet",
    url: "https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf",
  },
  {
    label: "Duke Eye Center OCTA Alzheimer research article",
    url: "https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms",
  },
  {
    label: "PMC open-access retinal biomarker review",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/",
  },
];

export const clinicalModelVersion = "thermoeye-literature-ruleset-2026.05";

const normalFinding =
  "OCTA screening pattern remains within the normal/reference band for this prototype: vessel-density proxy is preserved, FAZ/perfusion-risk proxy is not enlarged, and image quality is acceptable.";

const alzheimerRiskFinding =
  "OCTA screening pattern is consistent with Alzheimer-risk literature signals: reduced retinal vessel-density proxy with FAZ/perfusion-risk deviation. This is a referral-support result, not a diagnosis.";

const blockedFinding =
  "Image quality is blocked. Do not classify Alzheimer-risk status from this scan; request a repeat OCTA/OCT acquisition before releasing a report.";

export function createClinicalMetrics(input: {
  artifactScore: number;
  brightness: number;
  confidenceScore: number;
  contrast: number;
  imageHeight: number;
  imageWidth: number;
  qualityScore: number;
  sharpness: number;
  vesselDensity: number;
}): BaselineAnalysisMetrics {
  const vesselDensityProxy = Math.round(input.vesselDensity);
  const perfusionDensityProxy = Math.round(Math.min(98, Math.max(18, vesselDensityProxy + input.contrast * 0.18 - input.artifactScore * 0.12)));
  const fazRiskProxy = Math.round(Math.min(95, Math.max(8, 70 - vesselDensityProxy + Math.max(0, input.artifactScore - 12) * 0.45)));

  return {
    artifactScore: Math.round(input.artifactScore),
    brightness: Math.round(input.brightness),
    confidenceScore: Math.round(input.confidenceScore),
    contrast: Math.round(input.contrast),
    demoEngineVersion: clinicalModelVersion,
    fazRiskProxy,
    imageHeight: input.imageHeight,
    imageWidth: input.imageWidth,
    perfusionDensityProxy,
    qualityScore: input.qualityScore,
    sharpness: Math.round(input.sharpness),
    vesselDensity: vesselDensityProxy,
  };
}

export function classifyClinicalMetrics(metrics: BaselineAnalysisMetrics, age: number): ClinicalClassification {
  if (metrics.qualityScore < 55 || metrics.artifactScore > 45) {
    return {
      kind: "quality_blocked",
      riskLevel: "blocked",
      riskScore: 0,
      label: "Quality blocked",
      finding: blockedFinding,
      recommendation: "Repeat scan before AI screening, doctor release, or PDF generation.",
      evidence: [
        `Image quality ${Math.round(metrics.qualityScore)}%`,
        `Artifact estimate ${metrics.artifactScore}%`,
        "Classification withheld because quality gate failed",
      ],
    };
  }

  const ageAdjustment = Math.max(0, age - 60) * 0.35;
  const densitySignal = Math.max(0, 50 - metrics.vesselDensity) * 1.05;
  const fazSignal = Math.max(0, metrics.fazRiskProxy - 38) * 0.55;
  const perfusionSignal = Math.max(0, 50 - metrics.perfusionDensityProxy) * 0.65;
  const qualityAdjustment = Math.max(0, 74 - metrics.qualityScore) * 0.22;
  const riskScore = Math.round(Math.min(92, Math.max(8, 18 + ageAdjustment + densitySignal + fazSignal + perfusionSignal + qualityAdjustment)));
  const isRisk = riskScore >= 50 || metrics.vesselDensity < 42 || metrics.fazRiskProxy >= 45 || metrics.perfusionDensityProxy < 44;

  if (!isRisk) {
    return {
      kind: "normal",
      riskLevel: "low",
      riskScore: Math.min(riskScore, 34),
      label: "Normal screening pattern",
      finding: normalFinding,
      recommendation: "Continue routine eye/neurology care unless symptoms, family history, or clinician judgment require follow-up.",
      evidence: [
        `Vessel-density proxy ${metrics.vesselDensity}% preserved`,
        `FAZ/perfusion-risk proxy ${metrics.fazRiskProxy}% within reference band`,
        `Image quality ${Math.round(metrics.qualityScore)}% passed`,
      ],
    };
  }

  return {
    kind: "alzheimer_risk",
    riskLevel: riskScore >= 70 ? "high" : "moderate",
    riskScore: Math.max(riskScore, 58),
    label: "Alzheimer-risk screening pattern",
    finding: alzheimerRiskFinding,
    recommendation: "Recommend clinician review, cognitive screening correlation, and follow-up planning. Do not treat this as a standalone diagnosis.",
    evidence: [
      `Vessel-density proxy ${metrics.vesselDensity}% reduced`,
      `FAZ/perfusion-risk proxy ${metrics.fazRiskProxy}% elevated`,
      `Perfusion-density proxy ${metrics.perfusionDensityProxy}% reduced or borderline`,
    ],
  };
}

export function getCaseClassification(caseRecord: CaseRecord): ClinicalClassification {
  if (caseRecord.clinicalClassification) {
    return caseRecord.clinicalClassification;
  }

  const metrics = caseRecord.analysisMetrics ?? createClinicalMetrics({
    artifactScore: caseRecord.riskLevel === "blocked" ? 58 : caseRecord.riskLevel === "low" ? 6 : 18,
    brightness: 128,
    confidenceScore: Number(caseRecord.confidence.replace(/\D/g, "")) || 86,
    contrast: 42,
    imageHeight: 0,
    imageWidth: 0,
    qualityScore: Number(caseRecord.qualityLabel.replace(/\D/g, "")) || 92,
    sharpness: 72,
    vesselDensity: caseRecord.riskLevel === "low" ? 56 : caseRecord.riskLevel === "moderate" ? 39 : 32,
  });

  return classifyClinicalMetrics(metrics, caseRecord.age);
}

export function createCaseFromClinicalInput(input: {
  age: number;
  caseCode: string;
  eye?: CaseRecord["eye"];
  fileName?: string;
  metrics: BaselineAnalysisMetrics;
  scanType: string;
  sex: CaseRecord["sex"];
  uploadedImageUrl?: string;
}): CaseRecord {
  const classification = classifyClinicalMetrics(input.metrics, input.age);
  const normalizedCaseCode = input.caseCode.trim().toUpperCase().replace(/\s+/g, "-") || `TE-${Date.now()}`;
  const status = classification.kind === "quality_blocked" ? "Rescan needed" : "AI completed";
  const densityDelta = input.metrics.vesselDensity - 50;

  return {
    id: normalizedCaseCode,
    age: input.age,
    sex: input.sex,
    scanType: input.scanType.includes("OCT") ? "OCTA" : input.scanType,
    eye: input.eye ?? "OD",
    riskLevel: classification.riskLevel,
    riskScore: classification.riskScore,
    qualityLabel: `${classification.riskLevel === "blocked" ? "Fail" : "Pass"} ${Math.round(input.metrics.qualityScore)}`,
    status,
    context: `${input.age}${input.sex} · uploaded OCTA screening · ${input.scanType}`,
    confidence: classification.riskLevel === "blocked" ? "Confidence unavailable" : `Confidence ${Math.round(input.metrics.confidenceScore)}%`,
    density: `Vessel density ${densityDelta >= 0 ? "+" : ""}${densityDelta.toFixed(1)}%`,
    heatmap: getHeatmapLabel(classification.riskLevel),
    note: classification.finding,
    uploadedFileName: input.fileName,
    uploadedImageUrl: input.uploadedImageUrl,
    analysisMetrics: input.metrics,
    clinicalClassification: classification,
  };
}

export function getClinicalResultLabel(value: ClinicalClassification["kind"]) {
  if (value === "normal") return "Normal";
  if (value === "alzheimer_risk") return "Alzheimer risk";
  return "Quality blocked";
}

export function getClinicalResultTone(value: ClinicalClassification["kind"]): RiskLevel {
  if (value === "normal") return "low";
  if (value === "alzheimer_risk") return "high";
  return "blocked";
}

function getHeatmapLabel(riskLevel: RiskLevel) {
  if (riskLevel === "blocked") return "Quality blocked";
  if (riskLevel === "low") return "Low attention";
  if (riskLevel === "moderate") return "AD-risk attention";
  return "High AD-risk attention";
}
