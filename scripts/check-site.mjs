import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const html = fs.readFileSync(path.join(root, "bscode", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "bscode", "bscode.css"), "utf8");
const requiredFiles = [
  "resume.pdf",
  "assets/bscode/app-icon.png",
  "assets/bscode/motion/bscode-digital-twin.mp4",
  "assets/bscode/motion/bscode-digital-twin-alpha.mov",
  "assets/bscode/motion/bscode-digital-twin.webm",
  "assets/bscode/motion/bscode-digital-twin-poster.png",
  "bscode/bscode.css",
  "bscode/index.html",
  "ct-pet-viewer/install.sh",
  "ct-pet-viewer/install.ps1"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required website asset: ${file}`);
  }
}

for (const requiredDownload of [
  "https://github.com/axel-slid/ct-pet-review-workstation",
  "CT-PET-Review-Workstation-1.1.2-arm64.dmg",
  "CT-PET-Review-Workstation-1.1.0-Windows-x64.exe",
  "curl -fsSL https://alex-dils.com/ct-pet-viewer/install.sh | bash",
  "curl.exe -fsSL https://alex-dils.com/ct-pet-viewer/install.ps1 | powershell -NoProfile -ExecutionPolicy Bypass -Command -",
  "task021"
]) {
  if (!homeHtml.includes(requiredDownload)) throw new Error(`CT-PET download UI is missing: ${requiredDownload}`);
}

if ((html.match(/<video\b/g) || []).length !== 1) {
  throw new Error("The launch page must contain exactly one product film.");
}
for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
  if (!new RegExp(`\\b${attribute}\\b`).test(html)) {
    throw new Error(`The product film is missing its ${attribute} behavior.`);
  }
}
if (!html.includes("bscode-digital-twin.mp4")) {
  throw new Error("The Remotion digital-twin film is missing.");
}
if (!html.includes("bscode-digital-twin.webm")) {
  throw new Error("The transparent Remotion digital-twin film is missing.");
}
if (!html.includes("bscode-digital-twin-alpha.mov")) {
  throw new Error("The Safari transparent Remotion film is missing.");
}
if (!html.includes("bscode-digital-twin-poster.png")) {
  throw new Error("The digital-twin poster is missing.");
}
if (!html.includes("curl -fsSL https://alex-dils.com/bscode/install.sh | bash")) {
  throw new Error("The BsCode installer command is missing.");
}
if (!html.includes("https://github.com/axel-slid/bscode")) {
  throw new Error("The BsCode repository metadata is incorrect.");
}
if ((html.match(/<main\b/g) || []).length !== 1) {
  throw new Error("The page must have one unnested main landmark.");
}

const expectedCopy = [
  "BsCode",
  "Paste this into Terminal",
  "Free and open source"
];
for (const copy of expectedCopy) {
  if (!html.includes(copy)) {
    throw new Error(`Product-specific launch copy is missing: ${copy}`);
  }
}

for (const rule of [
  ".film-stage",
  "aspect-ratio: 1920 / 849",
  "@media (max-width: 620px)",
  "prefers-reduced-motion"
]) {
  if (!css.includes(rule)) {
    throw new Error(`The responsive product-film presentation is incomplete: ${rule}`);
  }
}

for (const removedElement of [
  "bscode-overview.mp4",
  "bscode-overview-poster.jpg",
  "workflow-tabs",
  "demo-workflows.js",
  "Agent workspace for macOS",
  "The real workflow,\nnot a highlight reel.",
  "No mock dashboard.",
  "Native command center for macOS",
  "BsCode puts Codex, Claude, shell sessions, local files, and SSH workspaces in one window.",
  "From a task to a finished file.",
  "A faithful digital twin follows the real controls and states",
  "Start four agents without opening four terminals.",
  "Know what is happening before a terminal stops.",
  "Local and SSH workspaces keep the same rhythm.",
  "Change the view. Keep the work.",
  "Built for Apple silicon",
  "Less window management.",
  "More finished work."
]) {
  if (html.includes(removedElement)) {
    throw new Error(`Obsolete launch-page content is still present: ${removedElement}`);
  }
}

const videoSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin.mp4")).size;
const transparentVideoSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin.webm")).size;
const safariVideoSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin-alpha.mov")).size;
const posterSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin-poster.png")).size;
if (videoSize < 100_000 || transparentVideoSize < 100_000 || safariVideoSize < 100_000 || posterSize < 10_000) {
  throw new Error("The digital-twin film or poster is unexpectedly small.");
}

console.log("BsCode launch page has one responsive digital-twin product film and product-specific copy.");
