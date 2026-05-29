import type { AuditEvent, CaseRecord, ViewId } from "./types";
import { classifyClinicalMetrics, createClinicalMetrics } from "./clinical-analysis";

export const navigationItems: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "pulse-icon" },
  { id: "cases", label: "Upload New Scan", icon: "upload-icon" },
  { id: "patients", label: "Patients", icon: "patient-icon" },
  { id: "analysis", label: "Analysis Results", icon: "scan-icon" },
  { id: "report", label: "Reports", icon: "report-icon" },
  { id: "insights", label: "Data Insights", icon: "chart-icon" },
  { id: "performance", label: "Model Performance", icon: "model-icon" },
  { id: "governance", label: "Data Management", icon: "data-icon" },
  { id: "settings", label: "Settings", icon: "settings-icon" },
];

const highRiskMetrics = createClinicalMetrics({
  artifactScore: 18,
  brightness: 118,
  confidenceScore: 88,
  contrast: 44,
  imageHeight: 375,
  imageWidth: 666,
  qualityScore: 96,
  sharpness: 82,
  vesselDensity: 20,
});

const moderateRiskMetrics = createClinicalMetrics({
  artifactScore: 11,
  brightness: 123,
  confidenceScore: 84,
  contrast: 39,
  imageHeight: 375,
  imageWidth: 666,
  qualityScore: 91,
  sharpness: 74,
  vesselDensity: 39,
});

const normalMetrics = createClinicalMetrics({
  artifactScore: 4,
  brightness: 130,
  confidenceScore: 92,
  contrast: 36,
  imageHeight: 375,
  imageWidth: 666,
  qualityScore: 98,
  sharpness: 80,
  vesselDensity: 58,
});

const blockedMetrics = createClinicalMetrics({
  artifactScore: 58,
  brightness: 184,
  confidenceScore: 0,
  contrast: 18,
  imageHeight: 375,
  imageWidth: 666,
  qualityScore: 42,
  sharpness: 22,
  vesselDensity: 24,
});

export const cases: CaseRecord[] = [
  {
    id: "TE-2405-0187",
    age: 67,
    sex: "F",
    scanType: "OCTA",
    eye: "OD",
    riskLevel: classifyClinicalMetrics(highRiskMetrics, 67).riskLevel,
    riskScore: classifyClinicalMetrics(highRiskMetrics, 67).riskScore,
    qualityLabel: "Pass 96",
    status: "Review pending",
    context: "67F · working senior · OCTA OD",
    confidence: "Confidence 88%",
    density: "Vessel density -30.0%",
    heatmap: "High AD-risk attention",
    note: classifyClinicalMetrics(highRiskMetrics, 67).finding,
    analysisMetrics: highRiskMetrics,
    clinicalClassification: classifyClinicalMetrics(highRiskMetrics, 67),
  },
  {
    id: "TE-2405-0182",
    age: 73,
    sex: "M",
    scanType: "OCT",
    eye: "OS",
    riskLevel: classifyClinicalMetrics(moderateRiskMetrics, 73).riskLevel,
    riskScore: classifyClinicalMetrics(moderateRiskMetrics, 73).riskScore,
    qualityLabel: "Pass 91",
    status: "AI completed",
    context: "73M · follow-up case · OCT OS",
    confidence: "Confidence 81%",
    density: "Vessel density -7.6%",
    heatmap: "AD-risk attention",
    note: classifyClinicalMetrics(moderateRiskMetrics, 73).finding,
    analysisMetrics: moderateRiskMetrics,
    clinicalClassification: classifyClinicalMetrics(moderateRiskMetrics, 73),
  },
  {
    id: "TE-2405-0179",
    age: 61,
    sex: "F",
    scanType: "OCTA",
    eye: "OU",
    riskLevel: classifyClinicalMetrics(normalMetrics, 61).riskLevel,
    riskScore: classifyClinicalMetrics(normalMetrics, 61).riskScore,
    qualityLabel: "Pass 98",
    status: "Report ready",
    context: "61F · routine scan · OCTA OU",
    confidence: "Confidence 92%",
    density: "Vessel density -1.8%",
    heatmap: "Low attention",
    note: classifyClinicalMetrics(normalMetrics, 61).finding,
    analysisMetrics: normalMetrics,
    clinicalClassification: classifyClinicalMetrics(normalMetrics, 61),
  },
  {
    id: "TE-2405-0176",
    age: 70,
    sex: "F",
    scanType: "OCTA",
    eye: "OS",
    riskLevel: classifyClinicalMetrics(blockedMetrics, 70).riskLevel,
    riskScore: classifyClinicalMetrics(blockedMetrics, 70).riskScore,
    qualityLabel: "Fail 42",
    status: "Rescan needed",
    context: "70F · OCTA OS · quality failure",
    confidence: "Confidence unavailable",
    density: "Artifact detected",
    heatmap: "Quality blocked",
    note: classifyClinicalMetrics(blockedMetrics, 70).finding,
    analysisMetrics: blockedMetrics,
    clinicalClassification: classifyClinicalMetrics(blockedMetrics, 70),
  },
];

export const initialAuditEvents: AuditEvent[] = [
  { time: "19:14", message: "Dr. K approved report for TE-2405-0179" },
  { time: "19:09", message: "Quality worker passed TE-2405-0187 with score 96" },
  { time: "18:57", message: "De-identification service removed direct identifiers from upload batch" },
  { time: "18:43", message: "Hospital staff downloaded released PDF report TE-2405-0171" },
];

export const dashboardMetrics = [
  { label: "OCTA Scans Reviewed", value: "1,248", caption: "3x3 macula protocol", tone: "purple" },
  { label: "Reduced Vessel Density", value: "142", caption: "VD/DCP signal flagged", tone: "green" },
  { label: "Mean Risk Score", value: "0.38", caption: "Screening support only", tone: "orange" },
  { label: "FAZ Enlargement Alerts", value: "317", caption: "Needs doctor context", tone: "blue" },
];

export const researchEvidence = [
  {
    title: "Retinal changes in brain disorders",
    source: "ResearchGate figure",
    type: "External figure",
    summary:
      "OCT-A figure used as visual evidence for retinal microvascular changes associated with brain disorders. Shown as an external source because figure reuse rights must be checked before embedding.",
    url: "https://www.researchgate.net/figure/Retinal-changes-in-brain-disorders-Optical-coherence-tomography-angiography-OCT-A_fig3_382473153",
  },
  {
    title: "Retinovascular changes in AD patients",
    source: "ResearchGate figure",
    type: "External figure",
    summary:
      "Reference image comparing retinovascular patterns in Alzheimer’s disease patients. Used for presenter reference and not copied into the product asset folder.",
    url: "https://www.researchgate.net/figure/Retinovascular-changes-in-AD-patients-This-Image-shows-the-differences-between-the_fig2_370356486",
  },
  {
    title: "Dementia Australia research sheet",
    source: "Dementia Australia",
    type: "Research brief",
    summary:
      "Research communication on retinal imaging and dementia-related biomarkers, useful for explaining why non-invasive eye scans are being explored for screening research.",
    url: "https://www.dementia.org.au/sites/default/files/2024-04/ResearchSheet_DrGraceLidgerwood-2021.pdf",
  },
  {
    title: "Could an eye doctor diagnose Alzheimer’s before symptoms?",
    source: "Duke Eye Center",
    type: "Clinical news",
    summary:
      "Duke Eye Center article discussing retinal imaging/OCTA research as a possible route for earlier Alzheimer’s-related risk signals before symptoms.",
    url: "https://dukeeyecenter.duke.edu/news/could-eye-doctor-diagnose-alzheimers-you-have-symptoms",
  },
  {
    title: "Peer-reviewed open access review",
    source: "PubMed Central",
    type: "PMC article",
    summary:
      "Open-access biomedical literature source for OCT/OCTA, retinal vascular biomarkers, and neurodegenerative disease context used to ground the demo narrative.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10917008/",
  },
];

export const pipelineSteps = [
  { label: "Upload", caption: "OCTA + metadata", state: "done" },
  { label: "Quarantine", caption: "Raw encrypted", state: "done" },
  { label: "Consent", caption: "Screening allowed", state: "done" },
  { label: "De-ID", caption: "PHI removed", state: "done" },
  { label: "Quality", caption: "Pass 96", state: "done" },
  { label: "AI analysis", caption: "Mock result ready", state: "active" },
  { label: "Doctor review", caption: "Pending", state: "pending" },
  { label: "Report", caption: "Locked", state: "pending" },
];
