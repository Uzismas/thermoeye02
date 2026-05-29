export type ViewId =
  | "dashboard"
  | "cases"
  | "patients"
  | "analysis"
  | "report"
  | "insights"
  | "performance"
  | "governance"
  | "settings";

export type RiskLevel = "low" | "moderate" | "high" | "blocked";

export type ClinicalClassification = {
  kind: "normal" | "alzheimer_risk" | "quality_blocked";
  riskLevel: RiskLevel;
  riskScore: number;
  label: string;
  finding: string;
  recommendation: string;
  evidence: string[];
};

export type CaseRecord = {
  id: string;
  age: number;
  sex: "F" | "M";
  scanType: string;
  eye: "OD" | "OS" | "OU";
  riskLevel: RiskLevel;
  riskScore: number;
  qualityLabel: string;
  status: string;
  context: string;
  confidence: string;
  density: string;
  heatmap: string;
  note: string;
  uploadedImageUrl?: string;
  uploadedFileName?: string;
  analysisMetrics?: BaselineAnalysisMetrics;
  clinicalClassification?: ClinicalClassification;
};

export type BaselineAnalysisMetrics = {
  brightness: number;
  contrast: number;
  sharpness: number;
  vesselDensity: number;
  qualityScore: number;
  confidenceScore: number;
  fazRiskProxy: number;
  artifactScore: number;
  imageWidth: number;
  imageHeight: number;
  perfusionDensityProxy: number;
  demoEngineVersion: string;
};

export type AuditEvent = {
  time: string;
  message: string;
};

export type ReviewDecision = "Pending review" | "Approved for release" | "Rescan requested" | "Follow-up required";

export type ReviewRecord = {
  decision: ReviewDecision;
  note: string;
  reviewer: string;
  followUpWindow: "Routine" | "30 days" | "90 days" | "Rescan first";
  updatedAt: string;
};

export type SessionUser = {
  name: string;
  role: "Doctor" | "Hospital staff" | "Admin";
  hospital: string;
};
