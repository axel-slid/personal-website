import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "bscode", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "bscode", "bscode.css"), "utf8");
const javascript = fs.readFileSync(path.join(root, "bscode", "bscode.js"), "utf8");
const installer = fs.readFileSync(path.join(root, "bscode", "install.sh"), "utf8");
const requiredFiles = [
  "resume.pdf",
  "assets/bscode/app-icon.png",
  "assets/bscode/motion/bscode-digital-twin.mp4",
  "assets/bscode/motion/bscode-digital-twin-poster.jpg",
  "bscode/bscode.css",
  "bscode/bscode.js",
  "bscode/index.html",
  "bscode/install.sh"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required website asset: ${file}`);
  }
}

if ((html.match(/<video\b/g) || []).length !== 1) {
  throw new Error("The launch page must contain exactly one Remotion background film.");
}
for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
  if (!new RegExp(`\\b${attribute}\\b`).test(html)) {
    throw new Error(`The Remotion background is missing its ${attribute} behavior.`);
  }
}
for (const asset of ["bscode-digital-twin.mp4", "bscode-digital-twin-poster.jpg"]) {
  if (!html.includes(asset)) {
    throw new Error(`The Remotion background is missing ${asset}.`);
  }
}

if ((html.match(/<main\b/g) || []).length !== 1) {
  throw new Error("The page must have one unnested main landmark.");
}
if (!html.includes("<h1>BsCode</h1>")) {
  throw new Error("The centered BsCode product name is missing.");
}
if (!html.includes("curl -fsSL https://alex-dils.com/bscode/install.sh | bash")) {
  throw new Error("The one-line BsCode install command is missing.");
}
if (!html.includes('id="copyInstall"')) {
  throw new Error("The install command copy control is missing.");
}
if (!html.includes('"softwareVersion": "0.2.5"')) {
  throw new Error("The current BsCode release metadata is missing.");
}
if (!html.includes('"codeRepository": "https://github.com/axel-slid/bscode"')) {
  throw new Error("The BsCode repository metadata is incorrect.");
}

for (const rule of [
  ".digital-twin",
  "position: fixed",
  "object-fit: cover",
  "overflow: hidden",
  "backdrop-filter: blur(24px)",
  ".film-caption",
  ".cinematic-bars",
  "body.is-cinematic .digital-twin video",
  "@keyframes caption-enter",
  "pointer-events: none",
  "@media (max-width: 620px)",
  "prefers-reduced-motion"
]) {
  if (!css.includes(rule)) {
    throw new Error(`The full-screen Remotion presentation is incomplete: ${rule}`);
  }
}

for (const behavior of [
  'navigator.clipboard.writeText(value)',
  'copyLabel.textContent = "Copied"',
  'const playbackRate = 0.65',
  'film.playbackRate = playbackRate',
  'document.body.classList.toggle("is-cinematic", sceneIndex === 2)',
  'filmCaption.classList.add("is-changing")',
  'One instruction switches the team into a focused cinematic workspace.',
  'film.play().catch(() => {})',
  'film.pause()'
]) {
  if (!javascript.includes(behavior)) {
    throw new Error(`The launch-page behavior is incomplete: ${behavior}`);
  }
}

for (const installerBehavior of [
  'releases/latest/download',
  'shasum -a 256 -c',
  'TARGET_APP="/Applications/BsCode.app"',
  'xattr -dr com.apple.quarantine',
  'the previous BsCode installation was restored'
]) {
  if (!installer.includes(installerBehavior)) {
    throw new Error(`The BsCode installer is incomplete: ${installerBehavior}`);
  }
}

const videoSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin.mp4")).size;
const posterSize = fs.statSync(path.join(root, "assets", "bscode", "motion", "bscode-digital-twin-poster.jpg")).size;
if (videoSize < 100_000 || posterSize < 10_000) {
  throw new Error("The Remotion background film or poster is unexpectedly small.");
}

console.log("BsCode launch page matches the Openleaf format with a full-screen Remotion background and working install command.");
