import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const appPort = Number(process.env.APP_PORT ?? 3010);
const appUrl = process.env.APP_URL ?? `http://127.0.0.1:${appPort}/console/dashboard`;
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";
const userDataDir = `/tmp/thermoeye-smoke-${Date.now()}`;
const screenshotPath = "output/playwright/thermoeye-smoke.png";
let stderrBuffer = "";
let serverOutput = "";
let ws;

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
  await waitFor(cdp, `document.body.innerText.includes("Sign in to review screening cases")`);
  await waitFor(cdp, `document.querySelector("form.login-form")?.dataset.ready === "true"`);
  await waitFor(cdp, `document.querySelector("form.login-form button[type='submit']")?.disabled === false`);

  await sleep(600);
  await submitLogin(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Welcome back, Dr. Nattapong")`);

  await clickButton(cdp, "New scan");
  await waitFor(cdp, `document.body.innerText.includes("Case intake and upload")`);
  await cdp.eval(`
    (async () => {
      const input = document.querySelector("#scan-file");
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(160, 160, 12, 160, 160, 152);
      gradient.addColorStop(0, "#effaf4");
      gradient.addColorStop(0.42, "#59b89f");
      gradient.addColorStop(1, "#092d36");
      ctx.fillStyle = "#0f2430";
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(160, 160, 136, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f8fff9";
      ctx.lineWidth = 5;
      for (let index = 0; index < 9; index += 1) {
        ctx.beginPath();
        ctx.moveTo(38, 60 + index * 24);
        ctx.bezierCurveTo(96, 108 + index * 7, 190, 88 + index * 18, 286, 66 + index * 20);
        ctx.stroke();
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "demo-octa-upload.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("demo-octa-upload.png selected")`);
  await clickButton(cdp, "Queue secure screening");
  await waitFor(cdp, `document.body.innerText.includes("Uploaded image analyzed")`);
  await waitFor(cdp, `document.body.innerText.includes("demo-octa-upload.png")`);
  await clickButton(cdp, "Dashboard");
  await waitFor(cdp, `document.body.innerText.includes("Selected Case Review")`);

  await cdp.eval(`
    (() => {
      const form = document.querySelector("form.review-form");
      form.elements.decision.value = "Approved for release";
      form.elements.followUpWindow.value = "30 days";
      form.elements.note.value = "Approved for release after OCTA review. Recommend cognitive screening correlation within 30 days.";
      form.requestSubmit();
    })()
  `);
  await waitFor(cdp, `document.body.innerText.includes("Approved for release")`);

  await clickButton(cdp, "Preview report");
  await waitFor(cdp, `document.body.innerText.includes("Clinical report preview")`);
  await waitFor(cdp, `
    (() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Download PDF mock"));
      return Boolean(button && !button.disabled);
    })()
  `);

  await clickButton(cdp, "Download PDF mock");
  await clickButton(cdp, "Data Management");
  await waitFor(cdp, `document.body.innerText.includes("PDF mock downloaded")`);

  await mkdir("output/playwright", { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  console.log(`Smoke flow passed: login -> review -> report -> audit`);
  console.log(`Screenshot: ${screenshotPath}`);
} finally {
  ws?.close();
  killProcessGroup(chrome);
  killProcessGroup(server);
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
