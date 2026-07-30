#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const explicitTargetIndex = process.argv.findIndex((argument) => /^https?:/.test(argument));
const targetUrl = explicitTargetIndex >= 0
  ? process.argv[explicitTargetIndex]
  : "http://127.0.0.1:4173/bscode/";
const outputDirectory = explicitTargetIndex >= 0
  ? (process.argv[explicitTargetIndex + 1] || "/tmp/bscode-product-visual-qa")
  : "/tmp/bscode-product-visual-qa";
const debugPort = Number(process.env.BSCODE_CDP_PORT || 9222);
const viewports = [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "tablet", width: 900, height: 1100, mobile: false },
  { name: "phone", width: 430, height: 900, mobile: true }
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connect() {
  const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
    .then((response) => response.json());
  const target = targets.find((candidate) => (
    candidate.type === "page"
    && (
      candidate.title.startsWith("BsCode")
      || candidate.url.endsWith("/index.html")
      || candidate.url.includes("127.0.0.1:4173/bscode")
      || candidate.url.includes("alex-dils.com/bscode")
    )
  ));
  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`No BsCode page found on Chromium debugging port ${debugPort}.`);
  }

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }
    const queue = listeners.get(message.method);
    if (!queue?.length) return;
    listeners.delete(message.method);
    queue.forEach((resolve) => resolve(message.params));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((resolve) => {
    listeners.set(method, [...(listeners.get(method) || []), resolve]);
  });
  return { socket, send, once };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result?.value;
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const { socket, send, once } = await connect();
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__bscodeQaErrors = [];
      window.addEventListener("error", (event) => {
        window.__bscodeQaErrors.push(event.message || "Unknown page error");
      });
      window.addEventListener("unhandledrejection", (event) => {
        window.__bscodeQaErrors.push(String(event.reason || "Unhandled rejection"));
      });
    `
  });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });

  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: targetUrl });
  await Promise.race([
    loaded,
    delay(10000).then(() => {
      throw new Error(`Timed out loading ${targetUrl}`);
    })
  ]);
  await evaluate(send, `
    Promise.all([
      document.fonts?.ready || Promise.resolve(),
      ...Array.from(document.images).map((image) => new Promise((resolve) => {
        if (image.complete) resolve();
        else {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 5000);
        }
      }))
    ])
  `);

  const report = [];
  for (const viewport of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height
    });
    await delay(900);
    await evaluate(send, `
      Promise.all(Array.from(document.images).map(async (image) => {
        image.loading = "eager";
        if (!image.complete) {
          await new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
            setTimeout(resolve, 5000);
          });
        }
        if (image.decode) await image.decode().catch(() => {});
      }))
    `);
    const metrics = await evaluate(send, `(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return {
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        },
        hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        hasDigitalTwin: Boolean(document.querySelector(".digital-twin #twinCanvas")),
        twinView: document.querySelector("#twinCanvas")?.dataset.view || null,
        workflowIds: Array.from(document.querySelectorAll("[data-workflow]"))
          .map((button) => button.dataset.workflow),
        brokenImages: Array.from(document.images)
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
        downloadLinks: links
          .map((link) => link.href)
          .filter((href) => href.includes("BsCode-macOS-arm64.zip")),
        keyRects: Object.fromEntries(
          [
            ["product-window", document.querySelector(".product-window")],
            ["product-title", document.getElementById("product-title")],
            ["download-button", document.querySelector(".download-button")],
            ["digital-twin", document.querySelector(".digital-twin")]
          ].map(([id, element]) => {
            const rect = element?.getBoundingClientRect();
            return [id, rect ? {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            } : null];
          })
        )
      };
    })()`);
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    await fs.writeFile(
      path.join(outputDirectory, `${viewport.name}.png`),
      Buffer.from(screenshot.data, "base64")
    );
    report.push({ ...viewport, ...metrics });
  }

  const workflowReport = [];
  const workflowExpectations = {
    workspace: { view: "workspace", className: "" },
    delegate: { view: "workspace", className: "is-team" },
    progress: { view: "workspace", className: "is-complete" },
    output: { view: "workspace", className: "is-output-preview" },
    cinematic: { view: "cinematic", className: "is-sent" },
    pixel: { view: "pixel", className: "is-pet-open" }
  };
  for (const workflowId of ["workspace", "delegate", "progress", "output", "cinematic", "pixel"]) {
    await evaluate(send, `document.querySelector('[data-workflow="${workflowId}"]')?.click()`);
    await delay(700);
    workflowReport.push(await evaluate(send, `(() => ({
      workflow: "${workflowId}",
      selected: document.querySelector('[data-workflow="${workflowId}"]')?.getAttribute("aria-selected"),
      view: document.querySelector("#twinCanvas")?.dataset.view || null,
      classes: Array.from(document.querySelector("#twinCanvas")?.classList || []),
      status: document.querySelector("#twinStatus")?.textContent?.trim() || "",
      step: document.querySelector("#twinStepCount")?.textContent?.trim() || "",
      labelledBy: document.querySelector("#productTwin")?.getAttribute("aria-labelledby") || ""
    }))()`));
  }

  const pageErrors = await evaluate(send, `window.__bscodeQaErrors || []`);
  socket.close();
  await fs.writeFile(
    path.join(outputDirectory, "report.json"),
    `${JSON.stringify({ viewports: report, workflows: workflowReport, pageErrors }, null, 2)}\n`
  );

  const failures = report.filter((entry) => (
    entry.hasHorizontalOverflow
    || entry.brokenImages.length > 0
    || !entry.hasDigitalTwin
    || entry.workflowIds.length !== 6
    || entry.downloadLinks.length < 1
    || Object.values(entry.keyRects).some((rect) => (
      !rect || rect.left < 0 || rect.left + rect.width > entry.viewport.width
    ))
  ));
  const workflowFailures = workflowReport.filter((entry) => {
    const expectation = workflowExpectations[entry.workflow];
    return (
      entry.selected !== "true"
      || entry.view !== expectation.view
      || (expectation.className && !entry.classes.includes(expectation.className))
      || !entry.status
      || !entry.step
      || !entry.labelledBy
    );
  });

  process.stdout.write(`${JSON.stringify({ outputDirectory, report, workflowReport, pageErrors, failures, workflowFailures }, null, 2)}\n`);
  if (failures.length || workflowFailures.length || pageErrors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
