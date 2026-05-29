import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const appUrl = process.env.APP_URL ?? "http://localhost:3000/console/dashboard";
const baseConsoleUrl = new URL(appUrl);
baseConsoleUrl.pathname = "/console";
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";
const outputDir = "web/feature-screenshots";
const normalFixture = {
  caseCode: "TE-CAPTURE-NORMAL",
  file: "test-assets/scans/real-reference/duke-reference-normal-octa.png",
};

const desktopPages = [
  { label: "01-dashboard", route: "dashboard", waitForText: "Welcome back" },
  { label: "02-upload", route: "cases", waitForText: "Case intake and upload" },
  { label: "03-patients", route: "patients", waitForText: "Patients" },
  { label: "04-analysis-normal", route: "analysis", waitForText: "Normal" },
  { label: "05-report-normal", route: "report", waitForText: "Clinical report preview" },
  { label: "06-data-insights", route: "insights", waitForText: "Data Insights" },
  { label: "07-model-performance", route: "performance", waitForText: "Model Performance" },
  { label: "08-data-management", route: "governance", waitForText: "Data Management" },
  { label: "09-settings", route: "settings", waitForText: "Settings" },
];

const mobilePages = [
  { label: "10-mobile-dashboard", route: "dashboard", waitForText: "Welcome back" },
  { label: "11-mobile-upload", route: "cases", waitForText: "Case intake and upload" },
  { label: "12-mobile-analysis-normal", route: "analysis", waitForText: "Normal" },
  { label: "13-mobile-report-normal", route: "report", waitForText: "Clinical report preview" },
];

const userDataDir = `/tmp/thermoeye-feature-capture-${Date.now()}`;
let stderrBuffer = "";
let ws;

const chrome = spawn(
  chromeBin,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);

chrome.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString();
});
chrome.stdout.on("data", () => {});

try {
  await waitForHttp(appUrl);
  const debugBaseUrl = await waitForDebugBaseUrl();
  const target = await createPageTarget(debugBaseUrl, appUrl);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  const cdp = createCdpClient(ws);

  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await mkdir(outputDir, { recursive: true });

  await setViewport(cdp, 1440, 1000, 1, false);
  await login(cdp);
  await uploadNormalFixture(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Normal")`);
  await approveAndOpenReport(cdp);

  for (const page of desktopPages) {
    await navigateToRoute(cdp, page.route);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(page.waitForText)})`);
    await sleep(400);
    await capture(cdp, `${outputDir}/${page.label}.png`);
    console.log(`${page.label}.png`);
  }

  await setViewport(cdp, 390, 844, 2, true);
  await sleep(400);

  for (const page of mobilePages) {
    await navigateToRoute(cdp, page.route);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(page.waitForText)})`);
    await sleep(400);
    await capture(cdp, `${outputDir}/${page.label}.png`);
    console.log(`${page.label}.png`);
  }
} finally {
  ws?.close();
  killProcessGroup(chrome);
}

async function uploadNormalFixture(cdp) {
  await navigateTo(cdp, "Upload New Scan");
  await waitFor(cdp, `document.body.innerText.includes("Case intake and upload")`);
  const buffer = await readFile(normalFixture.file);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  await cdp.eval(`
    (async () => {
      const input = document.querySelector("#scan-file");
      if (!input) throw new Error("File input not found");
      const caseCode = document.querySelector('[name="caseCode"]');
      if (caseCode) caseCode.value = ${JSON.stringify(normalFixture.caseCode)};
      const age = document.querySelector('[name="age"]');
      if (age) age.value = "68";
      const response = await fetch(${JSON.stringify(dataUrl)});
      const blob = await response.blob();
      const file = new File([blob], ${JSON.stringify(basename(normalFixture.file))}, { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(`${basename(normalFixture.file)} selected`)})`);
  await clickControl(cdp, "Queue secure screening");
  await waitFor(cdp, `document.body.innerText.includes("normal/reference band")`);
}

async function approveAndOpenReport(cdp) {
  await navigateTo(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Selected Case Review")`);
  await waitFor(cdp, `document.body.innerText.includes("Normal screening pattern")`);
  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      if (!form) throw new Error("Review form not found");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = "Routine";
      form.elements.note.value = "Approved for release after normal OCTA reference upload.";
      form.requestSubmit();
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("Approved for release")`);
  await clickControl(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Clinical report preview")`);
  await waitFor(cdp, `document.body.innerText.includes("Uploaded reference")`);
}

async function login(cdp) {
  await waitFor(cdp, `document.body.innerText.includes("Sign in to review screening cases") || document.body.innerText.includes("Welcome back")`);
  const isLoggedIn = await cdp.eval(`document.body.innerText.includes("Welcome back")`);
  if (isLoggedIn) return;

  await waitFor(cdp, `document.querySelector("form.login-form")?.dataset.ready === "true"`);
  await cdp.eval(`
    (async () => {
      const form = document.querySelector("form.login-form");
      if (!form) throw new Error("Login form not found");
      form.querySelector("button[type='submit']")?.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (document.body.innerText.includes("Sign in to review screening cases")) {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "doctor@thermoeye.demo", password: "pilot-access" }),
        });
        if (!response.ok) throw new Error("Session API login failed");
        location.reload();
      }
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("Welcome back")`);
}

async function navigateTo(cdp, text) {
  const visible = await cdp.eval(`document.body.innerText.includes(${JSON.stringify(text)})`);
  if (!visible) return;
  await clickControl(cdp, text);
}

async function navigateToRoute(cdp, route) {
  const url = new URL(baseConsoleUrl);
  url.pathname = `/console/${route}`;
  await cdp.send("Page.navigate", { url: url.toString() });
  await cdp.send("Page.loadEventFired").catch(() => {});
  await sleep(250);
}

async function setViewport(cdp, width, height, deviceScaleFactor, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile,
  });
}

async function capture(cdp, path) {
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
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
  throw new Error(`Timed out waiting for app server ${url}`);
}

async function waitForDebugBaseUrl() {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const match = stderrBuffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match?.[1]) {
      const url = new URL(match[1]);
      return `http://${url.host}`;
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for Chrome DevTools WebSocket URL");
}

async function createPageTarget(debugBaseUrl, url) {
  const response = await fetch(`${debugBaseUrl}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Unable to create page target: ${response.status}`);
  }
  return response.json();
}

function createCdpClient(socket) {
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(message.error.message));
    } else {
      handlers.resolve(message.result);
    }
  });

  return {
    ready,
    send(method, params = {}) {
      const requestId = ++id;
      const promise = new Promise((resolvePromise, rejectPromise) => {
        pending.set(requestId, { resolve: resolvePromise, reject: rejectPromise });
      });
      socket.send(JSON.stringify({ id: requestId, method, params }));
      return promise;
    },
    async eval(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      }
      return result.result.value;
    },
  };
}

async function waitFor(cdp, expression) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    try {
      if (await cdp.eval(expression)) return;
    } catch {}
    await sleep(150);
  }
  const bodyText = await cdp.eval(`document.body?.innerText.slice(0, 1600) ?? ""`);
  throw new Error(`Timed out waiting for expression: ${expression}\n\nBody:\n${bodyText}`);
}

async function clickControl(cdp, text) {
  await cdp.eval(`
    (() => {
      const control = [...document.querySelectorAll("button, a")].find((item) => item.textContent.includes(${JSON.stringify(text)}));
      if (!control) throw new Error("Control not found: ${text}");
      control.click();
    })()
  `);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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
