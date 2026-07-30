import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "bscode", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "bscode", "bscode.css"), "utf8");
const requiredFiles = [
  "resume.pdf",
  "assets/bscode/app-icon.png",
  "assets/bscode/agent-grid.jpg",
  "assets/bscode/motion/bscode-overview.mp4"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required website asset: ${file}`);
  }
}

if ((html.match(/<video\b/g) || []).length !== 1) {
  throw new Error("The BsCode product page must contain exactly one product video.");
}
if (!html.includes("BsCode-macOS-arm64.zip")) {
  throw new Error("The Apple silicon download link is missing.");
}
if (!html.includes("../resume.pdf")) {
  throw new Error("The current résumé link is missing.");
}
if (!html.includes("v0.2.2 · arm64")) {
  throw new Error("The current BsCode release label is missing.");
}
if (!css.includes("min-height: calc(100svh")) {
  throw new Error("The one-window viewport layout is missing.");
}

console.log("BsCode one-page product site is complete.");
