import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "bscode", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "bscode", "bscode.css"), "utf8");
const twin = fs.readFileSync(path.join(root, "bscode", "bscode.js"), "utf8");
const workflows = fs.readFileSync(path.join(root, "bscode", "demo-workflows.js"), "utf8");
const requiredFiles = [
  "resume.pdf",
  "assets/bscode/app-icon.png",
  "assets/bscode/agent-grid.jpg",
  "assets/bscode/pixel-mode.jpg",
  "assets/bscode/motion/workspace-cinematic.jpg",
  "assets/bscode/avatars/mario.png",
  "assets/bscode/avatars/alayah.png",
  "assets/bscode/avatars/matilda.png",
  "assets/bscode/avatars/aurelia.png",
  "bscode/bscode.js",
  "bscode/demo-workflows.js"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required website asset: ${file}`);
  }
}

if ((html.match(/<video\b/g) || []).length !== 0) {
  throw new Error("The passive product video must be replaced by the interactive digital twin.");
}
if (!html.includes("BsCode-macOS-arm64.zip")) {
  throw new Error("The Apple silicon download link is missing.");
}
if (!html.includes('"softwareVersion": "0.2.2"')) {
  throw new Error("The current BsCode release metadata is missing.");
}
if (!html.includes('class="digital-twin"') || !html.includes('id="twinCanvas"')) {
  throw new Error("The BsCode digital twin is missing.");
}
if ((html.match(/<main\b/g) || []).length !== 1) {
  throw new Error("The page must have one unnested main landmark.");
}
if (!html.includes('role="tabpanel"') || (html.match(/aria-controls="productTwin"/g) || []).length !== 6) {
  throw new Error("The workflow tabs are not connected to their product-twin panel.");
}

for (const workflowId of ["workspace", "delegate", "progress", "output", "cinematic", "pixel"]) {
  if (!workflows.includes(`id: "${workflowId}"`) || !html.includes(`data-workflow="${workflowId}"`)) {
    throw new Error(`The ${workflowId} workflow is missing from the product twin.`);
  }
}

for (const requiredBehavior of ["playWorkflow", "typeInto", "scaleTwin", "prefers-reduced-motion"]) {
  if (!twin.includes(requiredBehavior)) {
    throw new Error(`The digital twin behavior is incomplete: ${requiredBehavior}`);
  }
}
for (const finalState of ["is-team", "is-complete", "is-output-preview", "is-sent", "is-pet-open"]) {
  if (!twin.includes(finalState)) {
    throw new Error(`The digital twin cannot reach its ${finalState} workflow state.`);
  }
}
if (!twin.includes("Math.max(0.78")) {
  throw new Error("The responsive twin must preserve a readable minimum scale.");
}

if (!css.includes("width: 1200px") || !css.includes(".twin-canvas")) {
  throw new Error("The responsive digital-twin canvas is missing.");
}

for (const removedElement of ["<footer", "Résumé", "Agent workspace for macOS", "class=\"eyebrow\"", "class=\"product-facts\"", "class=\"demo-titlebar\""]) {
  if (html.includes(removedElement)) {
    throw new Error(`Obsolete landing-page chrome is still present: ${removedElement}`);
  }
}

console.log("BsCode launch page and interactive workflow twin are complete.");
