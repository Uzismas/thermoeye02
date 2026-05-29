import type { CaseRecord } from "./types";

export const riskTone: Record<CaseRecord["riskLevel"], string> = {
  high: "high",
  moderate: "moderate",
  low: "low",
  blocked: "blocked",
};

export const meterColor: Record<CaseRecord["riskLevel"], string> = {
  high: "var(--red)",
  moderate: "var(--amber)",
  low: "var(--green)",
  blocked: "#6b7280",
};

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
