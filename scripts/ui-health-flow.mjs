import { spawn } from "node:child_process";

const appPort = Number(process.env.APP_PORT ?? 3014);
const appUrl = process.env.APP_URL ?? `http://127.0.0.1:${appPort}/console/dashboard`;
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";
const userDataDir = `/tmp/thermoeye-ui-health-${Date.now()}`;
let stderrBuffer = "";
let serverOutput = "";
let ws;

const pages = [
  { label: "dashboard", control: "Dashboard", waitForText: "Welcome back, Dr. Nattapong" },
  { label: "upload", control: "Upload New Scan", waitForText: "Case intake and upload" },
  { label: "patients", control: "Patients", waitForText: "Patients" },
  { label: "analysis", control: "Analysis Results", waitForText: "Analysis Result" },
  { label: "report", control: "Reports", waitForText: "Clinical report preview" },
  { label: "insights", control: "Data Insights", waitForText: "Data Insights" },
  { label: "performance", control: "Model Performance", waitForText: "Model Performance" },
  { label: "data-management", control: "Data Management", waitForText: "Data Management" },
  { label: "settings", control: "Settings", waitForText: "Settings" },
];

const viewports = [
  { label: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  { label: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];

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
  const issues = [];

  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await waitFor(cdp, `document.body.innerText.includes("Sign in to review screening cases")`);
  await waitFor(cdp, `document.querySelector("form.login-form")?.dataset.ready === "true"`);
  await waitFor(cdp, `document.querySelector("form.login-form button[type='submit']")?.disabled === false`);

  await sleep(600);
  await submitLogin(cdp);
  await waitFor(cdp, `document.body.innerText.includes("Welcome back, Dr. Nattapong")`);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  for (const viewport of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", viewport);
    await sleep(300);

    for (const page of pages) {
      await clickControl(cdp, page.control);
      await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(page.waitForText)})`);
      await sleep(350);
      issues.push(...await collectLayoutHealth(cdp, viewport.label, page.label));
    }
  }

  if (issues.length > 0) {
    console.log(JSON.stringify(issues, null, 2));
    throw new Error(`UI health found ${issues.length} issue(s).`);
  }

  console.log(`UI health passed: ${pages.length} pages across ${viewports.map((item) => item.label).join(", ")}`);
} finally {
  ws?.close();
  killProcessGroup(chrome);
  killProcessGroup(server);
}

async function collectLayoutHealth(cdp, viewport, page) {
  return cdp.eval(`
    (() => {
      const issues = [];
      const viewport = ${JSON.stringify(viewport)};
      const page = ${JSON.stringify(page)};
      const documentElement = document.documentElement;
      const body = document.body;
      const overflow = Math.max(documentElement.scrollWidth, body.scrollWidth) - documentElement.clientWidth;

      if (overflow > 1) {
        const offenders = [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: getSelector(element),
              width: Math.round(rect.width),
              right: Math.round(rect.right),
              left: Math.round(rect.left),
              text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 80),
            };
          })
          .filter((item) => item.right > documentElement.clientWidth + 1 || item.left < -1)
          .sort((a, b) => Math.abs(b.right - documentElement.clientWidth) - Math.abs(a.right - documentElement.clientWidth))
          .slice(0, 5);
        issues.push({ viewport, page, type: "horizontal-overflow", details: { overflow, offenders } });
      }

      const visibleControls = [...document.querySelectorAll("button, a, input, select, textarea, label.dropzone")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        });

      for (const element of visibleControls) {
        const rect = element.getBoundingClientRect();
        const isCheckboxOrRadio = element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type);
        const isHiddenFileInput = element instanceof HTMLInputElement && element.type === "file" && element.closest("label.dropzone");
        const isSmallDesktopControl = viewport === "desktop" && (rect.width < 32 || rect.height < 32);
        const isSmallMobileControl = viewport === "mobile" && (rect.width < 44 || rect.height < 36);

        if (!isHiddenFileInput && !isCheckboxOrRadio && (isSmallDesktopControl || isSmallMobileControl)) {
          issues.push({
            viewport,
            page,
            type: "small-control",
            details: {
              selector: getSelector(element),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              text: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || "").trim().slice(0, 80),
            },
          });
        }
      }

      const nowrapTextOverflow = [...document.querySelectorAll("h1, h2, h3, p, span, strong, small, em, dd, dt")]
        .filter((element) => {
          if (element.classList.contains("visually-hidden")) return false;
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          return element.scrollWidth > Math.ceil(element.clientWidth) + 2 && getComputedStyle(element).whiteSpace === "nowrap";
        })
        .slice(0, 8)
        .map((element) => ({
          selector: getSelector(element),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 80),
        }));

      if (nowrapTextOverflow.length > 0) {
        issues.push({ viewport, page, type: "nowrap-text-overflow", details: nowrapTextOverflow });
      }

      return issues;

      function getSelector(element) {
        const id = element.id ? "#" + element.id : "";
        const classes = [...element.classList].slice(0, 3).map((item) => "." + item).join("");
        return element.tagName.toLowerCase() + id + classes;
      }
    })()
  `);
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
        pending.set(requestId, { resolve: resolve, reject });
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

async function clickControl(cdp, text) {
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
