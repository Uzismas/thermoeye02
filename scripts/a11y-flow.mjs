import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const appPort = Number(process.env.APP_PORT ?? 3011);
const appUrl = process.env.APP_URL ?? `http://127.0.0.1:${appPort}/console/dashboard`;
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";
const userDataDir = `/tmp/thermoeye-a11y-${Date.now()}`;
let stderrBuffer = "";
let serverOutput = "";
let ws;

const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

const server = spawn(
  "npm",
  ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(appPort)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

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
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await waitFor(cdp, `document.body.innerText.includes("Sign in to review screening cases")`);
  await waitFor(cdp, `document.querySelector("form.login-form")?.dataset.ready === "true"`);
  await waitFor(cdp, `document.querySelector("form.login-form button[type='submit']")?.disabled === false`);
  await runAxe(cdp, "login");

  await sleep(600);
  await submitLogin(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Welcome back, Dr. Nattapong")`);
  await runAxe(cdp, "dashboard");

  await clickButton(cdp, "New scan");
  await waitFor(cdp, `document.body.innerText.includes("Case intake and upload")`);
  await runAxe(cdp, "case intake");

  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Welcome back, Dr. Nattapong")`);
  await approveCurrentCase(cdp);
  await clickButton(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Clinical report preview")`);
  await runAxe(cdp, "report preview");

  await clickButton(cdp, "Data Management");
  await waitFor(cdp, `document.body.innerText.includes("Data Management")`);
  await runAxe(cdp, "data management");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await waitFor(cdp, `document.body.innerText.includes("Data Management")`);
  await runAxe(cdp, "data management mobile");

  console.log("A11y flow passed: login, dashboard, intake, report, data management, mobile data management");
} finally {
  ws?.close();
  killProcessGroup(chrome);
  killProcessGroup(server);
}

async function runAxe(cdp, label) {
  await cdp.eval(axeSource);
  const result = await cdp.eval(`
    axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]
      }
    }).then((result) => result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.slice(0, 3).map((node) => ({
        target: node.target.join(" "),
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })))
  `);

  if (result.length > 0) {
    const details = result
      .map((violation) => {
        const nodes = violation.nodes
          .map((node) => `  ${node.target}\n  ${node.failureSummary}\n  ${node.html}`)
          .join("\n");
        return `- ${violation.id} (${violation.impact}): ${violation.description}\n${nodes}`;
      })
      .join("\n");
    throw new Error(`Accessibility violations on ${label}:\n${details}`);
  }
}

async function approveCurrentCase(cdp) {
  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = "30 days";
      form.elements.note.value = "Approved for release after OCTA review.";
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
  throw new Error(`Timed out waiting for app server ${url}\n${serverOutput}`);
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

function createCdpClient(ws) {
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", (event) => {
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
      const promise = new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
      });
      ws.send(JSON.stringify({ id: requestId, method, params }));
      return promise;
    },
    async eval(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
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
  const bodyText = await cdp.eval(`document.body?.innerText.slice(0, 1200) ?? ""`);
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
    (() => {
      const form = document.querySelector("form.login-form");
      if (!form) throw new Error("Login form not found");
      form.requestSubmit();
    })()
  `);
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
