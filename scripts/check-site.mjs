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
if (!html.includes('"softwareVersion": "0.2.2"')) {
  throw new Error("The current BsCode release metadata is missing.");
}
if (!css.includes("min-height: 100svh")) {
  throw new Error("The full-viewport product layout is missing.");
}

for (const removedElement of ["<nav", "<footer", "class=\"eyebrow\"", "class=\"product-facts\"", "class=\"demo-titlebar\""]) {
  if (html.includes(removedElement)) {
    throw new Error(`Obsolete landing-page chrome is still present: ${removedElement}`);
  }
}

console.log("BsCode product page is clean, current, and download-ready.");
