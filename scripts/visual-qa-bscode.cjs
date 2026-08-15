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
  await evaluate(send, "document.fonts?.ready || Promise.resolve()");

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
    await delay(500);
    const topScreenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    await fs.writeFile(
      path.join(outputDirectory, `${viewport.name}-top.png`),
      Buffer.from(topScreenshot.data, "base64")
    );
    await evaluate(send, `document.querySelector(".film-stage")?.scrollIntoView({ block: "center" })`);
    await delay(400);
    const metrics = await evaluate(send, `(() => {
      const video = document.querySelector("#bscodeDigitalTwin");
      const frame = document.querySelector(".film-stage");
      const frameRect = frame?.getBoundingClientRect();
      const links = Array.from(document.querySelectorAll("a[href]"));
      return {
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        },
        hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        hasVerticalOverflow: document.documentElement.scrollHeight > innerHeight + 1,
        videoCount: document.querySelectorAll("video").length,
        videoSource: video?.querySelector("source")?.getAttribute("src") || "",
        videoPoster: video?.getAttribute("poster") || "",
        videoPausedForReducedMotion: Boolean(video?.paused),
        hasProductHeadline: document.body.innerText.includes("Run the whole coding session from one place."),
        hasSetupCommand: document.body.innerText.includes("xattr -dr com.apple.quarantine"),
        downloadLinks: links
          .map((link) => link.href)
          .filter((href) => href.includes("BsCode-macOS-arm64.zip")),
        frameRect: frameRect ? {
          left: Math.round(frameRect.left),
          top: Math.round(frameRect.top),
          right: Math.round(frameRect.right),
          bottom: Math.round(frameRect.bottom),
          width: Math.round(frameRect.width),
          height: Math.round(frameRect.height)
        } : null
      };
    })()`);
    const filmScreenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    await fs.writeFile(
      path.join(outputDirectory, `${viewport.name}-film.png`),
      Buffer.from(filmScreenshot.data, "base64")
    );
    report.push({ ...viewport, ...metrics });
    await evaluate(send, "scrollTo(0, 0)");
  }

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
  });
  const playbackStart = await evaluate(send, `(async () => {
    const video = document.querySelector("#bscodeDigitalTwin");
    video.currentTime = 0;
    await video.play();
    return video.currentTime;
  })()`);
  await delay(700);
  const playbackEnd = await evaluate(send, `document.querySelector("#bscodeDigitalTwin")?.currentTime || 0`);
  const playbackAdvanced = playbackEnd > playbackStart + 0.2;
  await evaluate(send, `document.querySelector("#bscodeDigitalTwin")?.pause()`);

  const pageErrors = await evaluate(send, "window.__bscodeQaErrors || []");
  socket.close();
  await fs.writeFile(
    path.join(outputDirectory, "report.json"),
    `${JSON.stringify({ viewports: report, playbackAdvanced, pageErrors }, null, 2)}\n`
  );

  const failures = report.filter((entry) => {
    const rect = entry.frameRect;
    return (
      entry.hasHorizontalOverflow
      || entry.videoCount !== 1
      || !entry.videoSource.includes("bscode-digital-twin.mp4")
      || !entry.videoPoster.includes("bscode-digital-twin-poster.jpg")
      || !entry.videoPausedForReducedMotion
      || !entry.hasProductHeadline
      || !entry.hasSetupCommand
      || entry.downloadLinks.length < 1
      || !rect
      || rect.width < 1
      || rect.height < 1
      || rect.left < 0
      || rect.top < 0
      || rect.right > entry.viewport.width + 1
      || rect.bottom > entry.viewport.height + 1
    );
  });

  process.stdout.write(`${JSON.stringify({ outputDirectory, report, playbackAdvanced, pageErrors, failures }, null, 2)}\n`);
  if (failures.length || !playbackAdvanced || pageErrors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
