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
      candidate.title === "BsCode"
      || candidate.url.endsWith("/index.html")
      || candidate.url.includes("127.0.0.1:4173/bscode")
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
  await send("Network.setCacheDisabled", { cacheDisabled: true });

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
      ...Array.from(document.querySelectorAll("video")).map((video) => new Promise((resolve) => {
        if (video.readyState >= 2) resolve();
        else {
          video.addEventListener("loadeddata", resolve, { once: true });
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
    const metrics = await evaluate(send, `(() => {
      const videos = Array.from(document.querySelectorAll("video"));
      const links = Array.from(document.querySelectorAll("a[href]"));
      return {
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        },
        hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        videos: videos.map((video) => ({
          readyState: video.readyState,
          width: video.videoWidth,
          height: video.videoHeight,
          source: video.currentSrc
        })),
        brokenImages: Array.from(document.images)
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
        downloadLinks: links
          .map((link) => link.href)
          .filter((href) => href.includes("BsCode-macOS-arm64.zip")),
        keyRects: Object.fromEntries(
          ["product-title", "motion-title", "download-title"].map((id) => {
            const element = document.getElementById(id);
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

  socket.close();
  await fs.writeFile(
    path.join(outputDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  const failures = report.filter((entry) => (
    entry.hasHorizontalOverflow
    || entry.brokenImages.length > 0
    || entry.videos.some((video) => (
      video.readyState < 2 || video.width !== 1280 || video.height !== 720
    ))
    || entry.downloadLinks.length < 3
    || Object.values(entry.keyRects).some((rect) => (
      !rect || rect.left < 0 || rect.left + rect.width > entry.viewport.width
    ))
  ));

  process.stdout.write(`${JSON.stringify({ outputDirectory, report, failures }, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
