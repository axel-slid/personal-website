import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "bscode", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "bscode", "bscode.css"), "utf8");
const requiredFiles = [
  "resume.pdf",
  "assets/bscode/app-icon.png",
  "assets/bscode/motion/bscode-overview.mp4",
  "assets/bscode/motion/bscode-overview-poster.jpg",
  "bscode/bscode.css",
  "bscode/index.html"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required website asset: ${file}`);
  }
}

if ((html.match(/<video\b/g) || []).length !== 1) {
  throw new Error("The launch page must contain exactly one product video.");
}
for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
  if (!new RegExp(`\\b${attribute}\\b`).test(html)) {
    throw new Error(`The product video is missing its ${attribute} behavior.`);
  }
}
if (!html.includes("bscode-overview.mp4")) {
  throw new Error("The Remotion overview video is missing.");
}
if (!html.includes("bscode-overview-poster.jpg")) {
  throw new Error("The product video poster is missing.");
}
if (!html.includes("BsCode-macOS-arm64.zip")) {
  throw new Error("The Apple silicon download link is missing.");
}
if (!html.includes('xattr -dr com.apple.quarantine "/Applications/BsCode.app"')) {
  throw new Error("The required first-launch quarantine command is missing.");
}
if (!html.includes('"softwareVersion": "0.2.2"')) {
  throw new Error("The current BsCode release metadata is missing.");
}
if ((html.match(/<main\b/g) || []).length !== 1) {
  throw new Error("The page must have one unnested main landmark.");
}

for (const rule of ["overflow: hidden", ".product-demo", "aspect-ratio: 16 / 9"]) {
  if (!css.includes(rule)) {
    throw new Error(`The responsive one-window presentation is incomplete: ${rule}`);
  }
}

for (const removedElement of [
  "<footer",
  "Résumé",
  "Agent workspace for macOS",
  "Every coding agent.",
  "The real workflow",
  "workflow-tabs",
  "digital-twin",
  "product-chapter",
  "final-cta",
  "bscode.js",
  "demo-workflows.js"
]) {
  if (html.includes(removedElement)) {
    throw new Error(`Obsolete landing-page chrome is still present: ${removedElement}`);
  }
}

const videoSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-overview.mp4")).size;
const posterSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-overview-poster.jpg")).size;
if (videoSize < 100_000 || posterSize < 10_000) {
  throw new Error("The product animation or poster is unexpectedly small.");
}

console.log("BsCode launch page is a single responsive Remotion product demo.");
