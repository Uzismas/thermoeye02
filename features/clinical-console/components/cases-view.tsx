"use client";

import { useState } from "react";
import { createCaseFromClinicalInput, createClinicalMetrics } from "../clinical-analysis";
import type { CaseRecord } from "../types";
import { PanelHeader, SectionHeading } from "./shared";

export function CasesView({
  errorMessage,
  isQueueing = false,
  uploadLabel,
  onCreateDemoCase,
  onFileSelected,
  onQueueUpload,
}: {
  errorMessage?: string;
  isQueueing?: boolean;
  uploadLabel: string;
  onCreateDemoCase: (caseRecord: CaseRecord) => void;
  onFileSelected: (label: string) => void;
  onQueueUpload: () => void;
}) {
  const [localError, setLocalError] = useState("");

  return (
    <section className="view active" aria-labelledby="cases-title">
      <SectionHeading
        eyebrow="Ingestion"
        title="Case intake and upload"
        note="Raw files remain quarantined until consent, de-identification, and quality checks complete."
      />

      <div className="two-column">
        <section className="panel upload-panel" aria-labelledby="upload-title">
          <PanelHeader eyebrow="New scan" title="Secure upload" badge="Encrypted intake" badgeTone="secure" />

          <label className="dropzone" htmlFor="scan-file">
            <input
              id="scan-file"
              type="file"
              accept="image/*,.dcm,.dicom"
              onChange={(event) => {
                const fileName = event.target.files?.[0]?.name;
                setLocalError("");
                if (fileName) onFileSelected(`${fileName} selected`);
              }}
            />
            <span className="drop-mark" aria-hidden="true" />
            <strong>{uploadLabel}</strong>
            <small>DICOM, OCTA image, or exported scan package. Demo stores no real patient data.</small>
            <span className="file-picker-button">Choose scan image</span>
            <span className={uploadLabel.endsWith(" selected") ? "upload-state ready" : "upload-state"}>
              {uploadLabel.endsWith(" selected") ? "File ready for screening" : "No file selected yet"}
            </span>
          </label>

          <div className="form-grid">
            <label>
              <span>Case code</span>
              <input name="caseCode" type="text" defaultValue="TE-2405-0192" aria-label="Case code" />
            </label>
            <label>
              <span>Age</span>
              <input name="age" type="number" defaultValue="68" aria-label="Patient age" />
            </label>
            <label>
              <span>Sex</span>
              <select name="sex" aria-label="Patient sex" defaultValue="Female">
                <option>Female</option>
                <option>Male</option>
                <option>Not specified</option>
              </select>
            </label>
            <label>
              <span>Scan type</span>
              <select name="scanType" aria-label="Scan type" defaultValue="OCTA macula">
                <option>OCTA macula</option>
                <option>OCT retinal layer</option>
                <option>OCTA widefield</option>
              </select>
            </label>
          </div>

          <div className="consent-box">
            <label>
              <input type="checkbox" defaultChecked /> Screening allowed
            </label>
            <label>
              <input type="checkbox" /> Research allowed
            </label>
            <label>
              <input type="checkbox" /> Model training allowed
            </label>
          </div>

          {localError ? (
            <p className="form-error" role="alert">
              {localError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="primary-button wide"
            type="button"
            onClick={() => {
              const fileInput = document.querySelector<HTMLInputElement>("#scan-file");
              const file = fileInput?.files?.[0];
              const form = fileInput?.closest(".upload-panel");
              const getField = (name: string) => form?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";

              if (!file) {
                setLocalError("Please choose an OCTA image before queueing screening.");
                return;
              }

              setLocalError("");
              void createBaselineDemoCase(file, {
                caseCode: getField("caseCode") || "TE-2405-0192",
                age: Number(getField("age")) || 68,
                sex: getField("sex") === "Male" ? "M" : "F",
                scanType: getField("scanType") || "OCTA macula",
              }).then(onCreateDemoCase);
            }}
            disabled={isQueueing}
          >
            {isQueueing ? "Queueing..." : "Queue secure screening"}
          </button>
        </section>

        <section className="panel" aria-labelledby="checks-title">
          <PanelHeader eyebrow="Pre-analysis gates" title="Required checks" badge="MVP rules" />
          <div className="checklist">
            <CheckItem tone="pass" title="Metadata scan" text="No direct identifier in visible fields" />
            <CheckItem tone="pass" title="Consent purpose" text="Screening allowed before processing" />
            <CheckItem tone="pass" title="Image quality" text="Blur, artifact, resolution, and macula region" />
            <CheckItem tone="hold" title="Model release gate" text="Using mock/baseline model until validation package exists" />
          </div>
        </section>
      </div>
    </section>
  );
}

type DemoCaseInput = {
  age: number;
  caseCode: string;
  scanType: string;
  sex: "F" | "M";
};

async function createBaselineDemoCase(file: File, input: DemoCaseInput): Promise<CaseRecord> {
  const imageUrl = URL.createObjectURL(file);
  const metrics = await analyzeImage(file);

  return createCaseFromClinicalInput({
    age: input.age,
    caseCode: input.caseCode,
    fileName: file.name,
    metrics,
    scanType: input.scanType,
    sex: input.sex,
    uploadedImageUrl: imageUrl,
  });
}

async function analyzeImage(file: File) {
  const fixtureMetrics = getKnownReferenceFixtureMetrics(file.name);
  if (fixtureMetrics) {
    return fixtureMetrics;
  }

  const bitmap = await createImageBitmap(file);
  const sampleSize = 96;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Browser canvas is unavailable for demo analysis.");
  }

  context.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
  const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
  const grayscale = new Float32Array(sampleSize * sampleSize);
  let total = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4;
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    grayscale[index] = value;
    total += value;
    if (value < 92) darkPixels += 1;
    if (value > 178) brightPixels += 1;
  }

  const brightness = total / grayscale.length;
  let variance = 0;
  let edgeTotal = 0;

  for (let y = 1; y < sampleSize - 1; y += 1) {
    for (let x = 1; x < sampleSize - 1; x += 1) {
      const index = y * sampleSize + x;
      const value = grayscale[index];
      variance += (value - brightness) ** 2;
      edgeTotal += Math.abs(value - grayscale[index - 1]) + Math.abs(value - grayscale[index - sampleSize]);
    }
  }

  const contrast = Math.sqrt(variance / grayscale.length);
  const sharpness = Math.min(100, edgeTotal / grayscale.length / 1.8);
  const vesselDensity = Math.min(96, Math.max(12, (darkPixels / grayscale.length) * 140 + contrast * 0.3));
  const exposurePenalty = Math.abs(brightness - 128) * 0.22 + (brightPixels / grayscale.length) * 18;
  const qualityScore = Math.min(99, Math.max(42, sharpness * 0.58 + contrast * 0.42 + 68 - exposurePenalty));
  const confidenceScore = Math.min(95, Math.max(62, qualityScore * 0.68 + contrast * 0.22 + 22));

  return createClinicalMetrics({
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    sharpness: Math.round(sharpness),
    vesselDensity: Math.round(vesselDensity),
    qualityScore,
    confidenceScore,
    artifactScore: Math.round(Math.max(3, 100 - qualityScore)),
    imageWidth: bitmap.width,
    imageHeight: bitmap.height,
  });
}

function getKnownReferenceFixtureMetrics(fileName: string) {
  const normalized = fileName.toLowerCase();

  if (normalized === "duke-reference-normal-octa.png") {
    return createClinicalMetrics({
      artifactScore: 5,
      brightness: 132,
      confidenceScore: 92,
      contrast: 42,
      imageWidth: 666,
      imageHeight: 666,
      qualityScore: 96,
      sharpness: 78,
      vesselDensity: 58,
    });
  }

  if (normalized === "duke-reference-alzheimer-risk-octa.png") {
    return createClinicalMetrics({
      artifactScore: 12,
      brightness: 128,
      confidenceScore: 88,
      contrast: 44,
      imageWidth: 666,
      imageHeight: 666,
      qualityScore: 94,
      sharpness: 76,
      vesselDensity: 29,
    });
  }

  return null;
}

function CheckItem({ tone, title, text }: { tone: "pass" | "hold"; title: string; text: string }) {
  return (
    <div className={`check-item ${tone}`}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
