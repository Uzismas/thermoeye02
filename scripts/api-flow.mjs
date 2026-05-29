import { spawn } from "node:child_process";

const appPort = Number(process.env.APP_PORT ?? 3021);
const appUrl = `http://127.0.0.1:${appPort}`;
let serverOutput = "";

const server = spawn(
  "node_modules/.bin/next",
  ["start", "--hostname", "127.0.0.1", "--port", String(appPort)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);

server.on("error", (error) => {
  serverOutput += `\nserver spawn error: ${error.message}`;
});
server.on("exit", (code, signal) => {
  serverOutput += `\nserver exited: code=${code ?? "null"} signal=${signal ?? "null"}`;
});
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForHttp(`${appUrl}/console/dashboard`);

  const riskPreview = await fetchJson(`${appUrl}/api/cases/TE-2405-0187/report/preview`);
  assertEqual(riskPreview.clinicalClassification.kind, "alzheimer_risk", "risk preview classification");
  assertEqual(riskPreview.releaseStatus, "locked", "risk preview release gate");

  const normalPreview = await fetchJson(`${appUrl}/api/cases/TE-2405-0179/report/preview`);
  assertEqual(normalPreview.clinicalClassification.kind, "normal", "normal preview classification");
  assertOneOf(normalPreview.releaseStatus, ["locked", "ready"], "normal preview existing release gate");

  const blockedPreview = await fetchJson(`${appUrl}/api/cases/TE-2405-0176/report/preview`);
  assertEqual(blockedPreview.clinicalClassification.kind, "quality_blocked", "blocked preview classification");
  assertEqual(blockedPreview.review.decision, "Rescan requested", "blocked preview review default");

  const lockedDownload = await fetch(`${appUrl}/api/cases/TE-2405-0187/report/download`, { method: "POST" });
  assertEqual(lockedDownload.status, 403, "locked download status");

  const blockedApproval = await fetch(`${appUrl}/api/cases/TE-2405-0176/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Approved for release",
      followUpWindow: "Routine",
      note: "Attempted approval for blocked scan quality.",
    }),
  });
  assertEqual(blockedApproval.status, 403, "blocked approval status");

  await fetchJson(`${appUrl}/api/cases/TE-2405-0179/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Approved for release",
      followUpWindow: "Routine",
      note: "Approved after OCTA screening review.",
    }),
  });

  const readyPreview = await fetchJson(`${appUrl}/api/cases/TE-2405-0179/report/preview`);
  assertEqual(readyPreview.releaseStatus, "ready", "approved preview release gate");

  const download = await fetchJson(`${appUrl}/api/cases/TE-2405-0179/report/download`, { method: "POST" });
  assertEqual(download.status, "downloaded", "approved download status");

  console.log("API flow passed: preview classifications, release gates, blocked approval, approved download");
} finally {
  killProcessGroup(server);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${url}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function waitForHttp(url) {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for app server ${url}\n${serverOutput}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertOneOf(actual, expected, label) {
  if (!expected.includes(actual)) {
    throw new Error(`${label}: expected one of ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}
