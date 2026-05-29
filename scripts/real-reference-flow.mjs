import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000/console/dashboard";
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";
const outputDir = "output/playwright";
const fixtures = [
  {
    caseCode: "TE-DUKE-NORMAL",
    expected: "Normal screening pattern",
    file: "test-assets/scans/real-reference/duke-reference-normal-octa.png",
    label: "normal",
    reportLabel: "Normal",
  },
  {
    caseCode: "TE-DUKE-RISK",
    expected: "Alzheimer-risk screening pattern",
    file: "test-assets/scans/real-reference/duke-reference-alzheimer-risk-octa.png",
    label: "risk",
    reportLabel: "Alzheimer risk",
  },
];

const userDataDir = `/tmp/thermoeye-real-reference-${Date.now()}`;
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

  await waitFor(cdp, `document.body.innerText.includes("Sign in to review screening cases")`);
  await waitFor(cdp, `document.querySelector("form.login-form")?.dataset.ready === "true"`);
  await waitFor(cdp, `document.querySelector("form.login-form button[type='submit']")?.disabled === false`);
  await submitLogin(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Welcome back")`);
  await mkdir(outputDir, { recursive: true });

  for (const fixture of fixtures) {
    await uploadFixture(cdp, fixture);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(fixture.reportLabel)})`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(
      fixture.expected.includes("Alzheimer")
        ? "Alzheimer-risk literature signals"
        : "normal/reference band",
    )})`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(basename(fixture.file))})`);
    await captureScreenshot(cdp, `${outputDir}/real-reference-${fixture.label}-analysis.png`);

    await approveCurrentCase(cdp, fixture.expected);
    await clickButton(cdp, "Preview report");
    await waitFor(cdp, `document.body.innerText.includes("Clinical report preview")`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(fixture.reportLabel)})`);
    await waitFor(cdp, `document.body.innerText.includes("Uploaded reference")`);
    await captureScreenshot(cdp, `${outputDir}/real-reference-${fixture.label}-report.png`);
  }

  console.log("Real reference flow passed:");
  for (const fixture of fixtures) {
    console.log(`- ${basename(fixture.file)} -> ${fixture.expected}`);
  }
} finally {
  ws?.close();
  killProcessGroup(chrome);
}

async function uploadFixture(cdp, fixture) {
  await clickButton(cdp, "Upload New Scan");
  await waitFor(cdp, `document.body.innerText.includes("Case intake and upload")`);
  const buffer = await readFile(fixture.file);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  await cdp.eval(`
    (async () => {
      const input = document.querySelector("#scan-file");
      if (!input) throw new Error("File input not found");
      const caseCode = document.querySelector('[name="caseCode"]');
      if (caseCode) caseCode.value = ${JSON.stringify(fixture.caseCode)};
      const age = document.querySelector('[name="age"]');
      if (age) age.value = "68";
      const response = await fetch(${JSON.stringify(dataUrl)});
      const blob = await response.blob();
      const file = new File([blob], ${JSON.stringify(basename(fixture.file))}, { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(`${basename(fixture.file)} selected`)})`);
  await clickButton(cdp, "Queue secure screening");
}

async function approveCurrentCase(cdp, expected) {
  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Selected Case Review")`);
  await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(expected)})`);
  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      if (!form) throw new Error("Review form not found");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = ${JSON.stringify(expected.includes("Alzheimer") ? "30 days" : "Routine")};
      form.elements.note.value = ${JSON.stringify(
        expected.includes("Alzheimer")
          ? "Approved for release after OCTA review. Recommend cognitive screening correlation within 30 days."
          : "Approved for release after OCTA review. Normal screening pattern can continue routine care.",
      )};
      form.requestSubmit();
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("Approved for release")`);
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

async function clickButton(cdp, text) {
  await cdp.eval(`
    (() => {
      const control = [...document.querySelectorAll("button, a")].find((item) => item.textContent.includes(${JSON.stringify(text)}));
      if (!control) throw new Error("Control not found: ${text}");
      control.click();
    })()
  `);
}

async function submitLogin(cdp) {
  await cdp.eval(`
    (async () => {
      const form = document.querySelector("form.login-form");
      if (!form) throw new Error("Login form not found");
      const button = form.querySelector("button[type='submit']");
      if (!button) throw new Error("Login button not found");
      button.click();
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
}

async function captureScreenshot(cdp, path) {
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
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
