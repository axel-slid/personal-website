import React, {useLayoutEffect, useMemo, useRef} from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import appHtml from "../app/index.html?raw";
import attentionPaperPage1 from "./assets/attention-is-all-you-need-page-1.png";
import pythonOutput from "./assets/python-output.png";
import "./openleaf-digital-twin.css";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"};
const ease = Easing.bezier(0.22, 1, 0.36, 1);

export const OPENLEAF_EXACT_DURATION = 1530;

export const OPENLEAF_EXACT_BEATS = [
  {start: 0, end: 150, title: "Create or import a complete project."},
  {start: 150, end: 440, title: "Write, preview, compile, and take notes."},
  {start: 440, end: 600, title: "Read the compiled PDF with a local neural voice."},
  {start: 600, end: 760, title: "Run Python files, cells, and notebooks."},
  {start: 760, end: 940, title: "Edit and present a native PowerPoint deck."},
  {start: 940, end: 1120, title: "Open Shell, Codex, and Claude in the real terminal workbench."},
  {start: 1120, end: 1240, title: "Inspect session history, then push LaTeX sources to GitHub."},
  {start: 1240, end: 1370, title: "Authenticate and open a remote SSH workspace."},
  {start: 1370, end: 1500, title: "Configure the exact workspace, appearance, and agent settings."},
  {start: 1500, end: 1530, title: "Create or import a complete project."},
];

const bodyMarkup = (() => {
  const match = appHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match ? match[1] : "").replace(/<script[\s\S]*?<\/script>/gi, "");
})();

const q = (root, selector) => root.querySelector(selector);
const qa = (root, selector) => Array.from(root.querySelectorAll(selector));
const id = (root, name) => q(root, `#${name}`);
const setHidden = (node, hidden) => { if (node) node.hidden = hidden; };
const setText = (node, text) => { if (node) node.textContent = text; };
const setValue = (node, value) => { if (node) node.value = value; };
const hideProjectGreeting = (root) => {
  const title = id(root, "projectHeroTitle");
  if (!title) return;
  title.hidden = true;
  title.style.display = "none";
};

const projectPreview = (kind) => {
  if (kind === "pptx") return `<div class="exact-project-slide"><i></i><h4>Quarterly Research</h4><p>RESULTS THAT COMPOUND</p><b></b><b></b><b></b></div>`;
  if (kind === "python") return `<div class="exact-project-python"><code>import pandas as pd</code><code>metrics.plot()</code><svg viewBox="0 0 240 110"><path d="M8 94 C42 76 61 86 88 54 S137 67 163 34 S208 35 232 10"></path></svg></div>`;
  if (kind === "remote") return `<div class="exact-project-remote"><span>&gt;_</span><code>ssh alex@gpu-lab.edu</code><code>~/research/attention-is-all-you-need</code><strong>CONNECTED</strong></div>`;
  return `<div class="exact-project-paper"><h4>Attention Is All You Need</h4><p>Vaswani et al. · NeurIPS 2017</p><hr><h5>Abstract</h5><i></i><i></i><i></i><h5>1　Introduction</h5><i></i><i></i></div>`;
};

const projectCard = ({name, file, folder, kind, favorite = false}) => `
  <article class="project-card" role="button" tabindex="0">
    <button class="project-favorite-button ${favorite ? "active" : ""}" type="button" aria-label="Favorite ${name}">☆</button>
    <button class="project-remove-button" type="button" aria-label="Remove ${name}">⌫</button>
    <span class="project-preview" aria-hidden="true">${projectPreview(kind)}</span>
    <span class="project-card-copy">
      <span class="project-card-title-row"><span class="project-name">${name}</span></span>
      <span class="project-file">${file} · ${folder}</span>
      <span class="project-card-meta-row"><span class="project-meta">Edited just now</span></span>
    </span>
  </article>`;

const projectCards = () => [
  {name: "Attention Is All You Need", file: "ms.tex", folder: "attention-is-all-you-need", kind: "tex", favorite: true},
  {name: "Quarterly Research", file: "Quarterly Research.pptx", folder: "research-deck", kind: "pptx"},
  {name: "Transformer Analysis", file: "analysis.py", folder: "analysis", kind: "python"},
  {name: "Remote GPU Lab", file: "ms.tex", folder: "gpu-lab.edu", kind: "remote"},
].map(projectCard).join("");

const fileRow = (name, active = false, depth = 0, label = "") => `
  <button class="file-item ${active ? "active" : ""}" type="button" style="--depth-indent:${depth * 14}px">
    <span class="file-icon">${label || (name.split(".").pop() || "").slice(0, 3).toUpperCase()}</span>
    <span class="file-name">${name}</span>
  </button>`;

const folder = (name, children) => `
  <details class="file-folder" open style="--depth-indent:0px">
    <summary><span class="file-folder-icon">▰</span><span class="folder-name">${name}</span></summary>
    <div class="file-children" style="--depth-indent:0px">${children}</div>
  </details>`;

const latexFiles = (active = "ms.tex") => [
  folder("Figures", fileRow("ModalNet-19.png", false, 1, "IMG") + fileRow("ModalNet-20.png", false, 1, "IMG") + fileRow("ModalNet-21.png", false, 1, "IMG")),
  fileRow("background.tex", active === "background.tex", 0, "TEX"),
  fileRow("introduction.tex", active === "introduction.tex", 0, "TEX"),
  fileRow("model_architecture.tex", active === "model_architecture.tex", 0, "TEX"),
  fileRow("main.pdf", active === "main.pdf", 0, "PDF"),
  fileRow("ms.tex", active === "ms.tex", 0, "TEX"),
  fileRow("nips_2017.sty", active === "nips_2017.sty", 0, "STY"),
  fileRow("results.tex", active === "results.tex", 0, "TEX"),
  fileRow("training.tex", active === "training.tex", 0, "TEX"),
  fileRow("why_self_attention.tex", active === "why_self_attention.tex", 0, "TEX"),
].join("");

const pythonFiles = (active) => [
  fileRow("analysis.py", active === "analysis.py", 0, "PY"),
  fileRow("analysis.ipynb", active === "analysis.ipynb", 0, "NB"),
  fileRow("model.py", false, 0, "PY"),
  fileRow("results.csv", false, 0, "CSV"),
  fileRow("attention.png", false, 0, "IMG"),
].join("");

const codeLine = (number, html) => `<div class="CodeMirror-line exact-code-line"><span class="exact-line-number">${number}</span><pre>${html || "&nbsp;"}</pre></div>`;
const latexCode = (modelArchitecture = false) => {
  const lines = modelArchitecture ? [
    `<span class="cm-keyword">\\begin</span>{figure}`,
    `  <span class="cm-keyword">\\centering</span>`,
    `  <span class="cm-keyword">\\includegraphics</span>[scale=0.6]{Figures/ModalNet-21}`,
    `  <span class="cm-keyword">\\caption</span>{The Transformer - model architecture.}`,
    `  <span class="cm-keyword">\\label</span>{fig:model-arch}`,
    `<span class="cm-keyword">\\end</span>{figure}`,
    "",
    `Most competitive neural sequence transduction models have an`,
    `encoder-decoder structure. The Transformer follows this overall`,
    `architecture using stacked self-attention and point-wise, fully`,
    `connected layers for both the encoder and decoder.`,
    "",
    `<span class="cm-keyword">\\subsection</span>{Attention}`,
    `An attention function can be described as mapping a query and a`,
    `set of key-value pairs to an output.`,
    "",
    `<span class="cm-keyword">\\subsubsection</span>{Scaled Dot-Product Attention}`,
    `We compute the matrix of outputs as:`,
    `<span class="cm-keyword">\\begin</span>{equation}`,
    `  \\mathrm{Attention}(Q, K, V) = \\mathrm{softmax}`,
    `  (\\frac{QK^T}{\\sqrt{d_k}})V`,
    `<span class="cm-keyword">\\end</span>{equation}`,
    "",
    `<span class="cm-keyword">\\subsubsection</span>{Multi-Head Attention}`,
    `Multi-head attention allows the model to jointly attend to`,
    `information from different representation subspaces at different`,
    `positions. With a single attention head, averaging inhibits this.`,
  ] : [
    `<span class="cm-keyword">\\documentclass</span>{article}`,
    `<span class="cm-keyword">\\PassOptionsToPackage</span>{numbers, compress}{natbib}`,
    `<span class="cm-keyword">\\usepackage</span>[final]{nips_2017}`,
    `<span class="cm-keyword">\\usepackage</span>[utf8]{inputenc}`,
    `<span class="cm-keyword">\\usepackage</span>[T1]{fontenc}`,
    `<span class="cm-keyword">\\usepackage</span>{hyperref}`,
    `<span class="cm-keyword">\\usepackage</span>{url}`,
    `<span class="cm-keyword">\\usepackage</span>{booktabs}`,
    `<span class="cm-keyword">\\usepackage</span>{amsfonts}`,
    `<span class="cm-keyword">\\usepackage</span>{amsmath}`,
    `<span class="cm-keyword">\\usepackage</span>{nicefrac}`,
    `<span class="cm-keyword">\\usepackage</span>{microtype}`,
    `<span class="cm-keyword">\\usepackage</span>{graphicx}`,
    "",
    `<span class="cm-keyword">\\title</span>{Attention Is All You Need}`,
    `<span class="cm-keyword">\\author</span>{`,
    `  Ashish Vaswani\\thanks{Equal contribution.} \\And`,
    `  Noam Shazeer\\footnotemark[1] \\And Niki Parmar\\footnotemark[1] \\And`,
    `  Jakob Uszkoreit\\footnotemark[1] \\And Llion Jones\\footnotemark[1] \\And`,
    `  Aidan N. Gomez\\footnotemark[1] \\And {\\L}ukasz Kaiser\\footnotemark[1] \\And`,
    `  Illia Polosukhin\\footnotemark[1]`,
    `}`,
    "",
    `<span class="cm-keyword">\\begin</span>{document}`,
    `<span class="cm-keyword">\\maketitle</span>`,
    `<span class="cm-keyword">\\begin</span>{abstract}`,
    `The dominant sequence transduction models are based on complex recurrent or`,
    `convolutional neural networks that include an encoder and a decoder.`,
    `We propose a new simple network architecture, the Transformer, based solely`,
    `on attention mechanisms, dispensing with recurrence and convolutions entirely.`,
    `<span class="cm-keyword">\\end</span>{abstract}`,
    `<span class="cm-keyword">\\section</span>{Introduction}`,
    `<span class="cm-keyword">\\input</span>{introduction}`,
    `<span class="cm-keyword">\\section</span>{Background}`,
    `<span class="cm-keyword">\\input</span>{background}`,
    `<span class="cm-keyword">\\section</span>{Model Architecture}`,
    `<span class="cm-keyword">\\input</span>{model_architecture}`,
  ];
  return `<div class="CodeMirror exact-code-mirror"><div class="CodeMirror-scroll"><div class="exact-code-content">${lines.map((line, index) => codeLine(index + 1, line)).join("")}</div></div></div>`;
};

const visualDocument = `
  <article class="exact-visual-document">
    <div class="exact-visual-title-rule"></div>
    <h1>Attention Is All You Need</h1>
    <div class="exact-visual-authors">
      <p><strong>Ashish Vaswani*</strong><span>Google Brain</span><small>avaswani@google.com</small></p>
      <p><strong>Noam Shazeer*</strong><span>Google Brain</span><small>noam@google.com</small></p>
      <p><strong>Niki Parmar*</strong><span>Google Research</span><small>nikip@google.com</small></p>
      <p><strong>Jakob Uszkoreit*</strong><span>Google Research</span><small>usz@google.com</small></p>
      <p><strong>Llion Jones*</strong><span>Google Research</span><small>llion@google.com</small></p>
      <p><strong>Aidan N. Gomez*</strong><span>University of Toronto</span><small>aidan@cs.toronto.edu</small></p>
      <p><strong>Łukasz Kaiser*</strong><span>Google Brain</span><small>lukaszkaiser@google.com</small></p>
      <p><strong>Illia Polosukhin*</strong><small>illia.polosukhin@gmail.com</small></p>
    </div>
    <h2 class="exact-visual-abstract-title">Abstract</h2>
    <p>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.</p>
    <p>Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task and 41.8 BLEU on the WMT 2014 English-to-French translation task.</p>
    <h2>1&nbsp;&nbsp;Introduction</h2>
    <p>Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.</p>
    <p>In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.</p>
  </article>`;

const pdfPage = ({highlight = -1} = {}) => {
  const highlightTop = [45.2, 46.7, 48.2, 49.7, 51.2, 52.7, 54.2, 55.7][highlight];
  return `<article class="pdf-page exact-pdf-page exact-real-paper-page" data-page="1">
    <img class="exact-real-paper-image" src="${attentionPaperPage1}" alt="Attention Is All You Need by Vaswani and coauthors, NeurIPS 2017" />
    ${highlightTop === undefined ? "" : `<span class="exact-real-paper-highlight" style="top:${highlightTop}%"></span>`}
  </article>`;
};

const notebookMarkup = (ranAll) => `
  <header class="ipynb-toolbar"><div class="ipynb-toolbar-actions"><button>+ Code</button><button>+ Markdown</button><span class="ipynb-toolbar-divider"></span><button>▷ Run All</button><button>Clear All Outputs</button></div></header>
  <div class="ipynb-notebook-cells">
    <article class="ipynb-cell"><button class="ipynb-cell-run">▷</button><div class="ipynb-cell-body"><pre>import pandas as pd\nfrom openleaf import workspace</pre>${ranAll ? `<small>In [1] · completed</small>` : ""}</div></article>
    <article class="ipynb-cell"><button class="ipynb-cell-run">▷</button><div class="ipynb-cell-body"><pre>metrics = workspace.read_csv("results.csv")\nmetrics.plot()</pre>${ranAll ? `<small>Out [2] · chart rendered below</small>` : ""}</div></article>
  </div>`;

const pythonChart = () => `
  <article class="python-run-card"><span class="python-execution-count">[1]</span><div class="python-run-source"><pre>plt.plot(epochs, accuracy)</pre></div>
  <div class="python-run-output"><div class="python-run-label">completed in 0.42s</div><img src="${pythonOutput}" style="display:block;width:100%;max-width:800px;height:auto;margin:16px auto" alt="Validation accuracy plotted against training epochs" /></div></article>`;

const slideThumb = (number, title, active) => `<button class="pptx-slide-thumb ${active ? "active" : ""}" type="button"><span class="pptx-slide-thumb-number">${number}</span><span class="pptx-slide-thumb-preview exact-slide-thumb"><i></i><b>${title}</b></span><span class="pptx-slide-thumb-title">${title}</span></button>`;
const slideCanvas = ({second = false, selected = false, chart = false} = {}) => `
  <div class="exact-slide-accent"></div>
  <div class="pptx-element pptx-text-element exact-slide-title ${selected ? "selected" : ""}"><span class="pptx-element-text">${second ? "Results that compound" : "Research without context switching"}</span>${selected ? `<i class="pptx-element-handle nw"></i><i class="pptx-element-handle se"></i>` : ""}</div>
  <div class="pptx-element pptx-text-element exact-slide-copy"><span class="pptx-element-text">${second ? "Compile, analyze, present, and collaborate in one native workspace." : "LaTeX · live PDF · PowerPoint · Python · agents"}</span></div>
  ${chart ? `<div class="pptx-element exact-slide-chart"><b>Iteration speed</b><div><i style="height:34%"></i><i style="height:52%"></i><i style="height:71%"></i><i style="height:92%"></i></div></div>` : `<div class="exact-slide-window"><i></i><i></i><i></i><span></span></div>`}`;

const terminalPane = (kind, complete) => `<div class="terminal-instance exact-terminal-instance"><pre><b class="${kind.toLowerCase()}">${kind}</b>\n<span class="muted">/Users/alex/research/attention-is-all-you-need</span>\n\n${kind === "Shell" ? `<span class="prompt">$</span> tectonic ms.tex\nRunning TeX ...\n<span class="success">Compiled main.pdf in 0.8s</span>` : kind === "Codex" ? `Reading AGENTS.md and the active project…\n${complete ? `<span class="success">✓ indexed original NeurIPS sources</span>\n<span class="success">✓ updated model_architecture.tex</span>\n<span class="success">✓ compiled ms.tex</span>` : "Working…"}` : `Reviewing the compiled manuscript…\n${complete ? `<span class="success">✓ checked claims against results.tex</span>\n<span class="success">✓ review complete</span>` : "Working…"}`}</pre></div>`;

const resetApp = (root) => {
  const app = q(root, ".app");
  if (app) app.className = "app";
  ["projectScreen", "editorScreen", "presentationScreen"].forEach((name) => setHidden(id(root, name), true));
  ["settingsBackdrop", "newProjectPanel", "templatesPanel", "sshProjectPanel", "settingsDrawer", "commandPalette"].forEach((name) => setHidden(id(root, name), true));
  setHidden(id(root, "pythonKernelMenu"), true);
  setHidden(id(root, "pdfViewerShell"), false);
  setHidden(q(root, ".preview-pane .pane-header"), false);
  const workspace = id(root, "workspace");
  if (workspace) workspace.className = "workspace";
  const previewPane = q(root, ".preview-pane");
  if (previewPane) previewPane.className = "preview-pane log-collapsed";
  setHidden(id(root, "historyPanel"), true);
  const terminalPanel = id(root, "terminalPanel");
  if (terminalPanel) terminalPanel.className = "terminal-panel";
  const sourcePane = q(root, ".source-pane");
  if (sourcePane && terminalPanel?.parentElement !== sourcePane) sourcePane.appendChild(terminalPanel);
  if (sourcePane) sourcePane.className = "source-pane terminal-collapsed";
  const notes = id(root, "notesPanel");
  if (notes) notes.className = "notes-panel";
  qa(root, ".exact-notes-drawing").forEach((node) => node.remove());
  const logPanel = id(root, "compileLogPanel");
  if (logPanel) logPanel.className = "log-panel log-collapsed";
  const presentation = id(root, "presentationScreen");
  if (presentation) presentation.className = "presentation-screen";
  setHidden(id(root, "ipynbNotebookEditor"), true);
  setHidden(id(root, "visualEditor"), true);
  setHidden(id(root, "mediaViewer"), true);
  setHidden(id(root, "pythonRuntimeControls"), true);
  setHidden(id(root, "pythonEditorToolbar"), true);
  setHidden(id(root, "pythonNotebookPanel"), true);
  setHidden(id(root, "pythonKernelMenu"), true);
  const sourceMode = id(root, "sourceModeButton");
  const visualMode = id(root, "visualModeButton");
  sourceMode?.classList.add("active");
  visualMode?.classList.remove("active");
  id(root, "pdfReaderButton")?.setAttribute("aria-pressed", "false");
  const speechControls = id(root, "pdfSpeechControls");
  speechControls?.classList.remove("exact-expanded");
  if (speechControls) speechControls.dataset.state = "ready";
  root.classList.remove("exact-pdf-reader");
  const backdrop = id(root, "settingsBackdrop");
  if (backdrop) backdrop.className = "settings-backdrop";
};

const fillProjectScreen = (root) => {
  setHidden(id(root, "projectScreen"), false);
  hideProjectGreeting(root);
  const grid = id(root, "projectGrid");
  if (grid) grid.innerHTML = projectCards();
  setHidden(id(root, "projectEmpty"), true);
};

const fillEmptyProjectScreen = (root) => {
  setHidden(id(root, "projectScreen"), false);
  hideProjectGreeting(root);
  const grid = id(root, "projectGrid");
  if (grid) grid.innerHTML = "";
  setHidden(id(root, "projectEmpty"), false);
};

const showNewProject = (root) => {
  fillEmptyProjectScreen(root);
  setHidden(id(root, "settingsBackdrop"), false);
  setHidden(id(root, "newProjectPanel"), false);
  id(root, "addProjectButton")?.classList.add("active");
};

const prepareEditor = (root, {activeFile = "ms.tex", remote = false} = {}) => {
  setHidden(id(root, "editorScreen"), false);
  setText(id(root, "activeDocumentTitle"), remote ? "Remote GPU Lab" : activeFile.startsWith("analysis") ? "Transformer Analysis" : "Attention Is All You Need");
  setText(id(root, "editorTitle"), activeFile);
  setText(id(root, "sourceStats"), activeFile.endsWith(".py") ? "38 lines · Python" : activeFile.endsWith(".ipynb") ? "4 cells · Jupyter notebook" : activeFile === "model_architecture.tex" ? "155 lines · 2,322 words" : "417 lines · 2,026 words");
  setText(id(root, "topSaveStatusLabel"), "Saved");
  setText(id(root, "saveState"), "Saved");
  setText(id(root, "compileState"), "Waiting for compile");
  const badge = id(root, "sshConnectionBadge");
  setHidden(badge, !remote);
  if (badge && remote) {
    badge.dataset.state = "connected";
    badge.innerHTML = `<span class="ssh-connection-status-dot"></span><span>Connected · alex@gpu-lab.edu</span>`;
  }
  const tree = id(root, "fileTree");
  if (tree) tree.innerHTML = activeFile.startsWith("analysis") ? pythonFiles(activeFile) : latexFiles(activeFile);
  const tabs = id(root, "textTabs");
  if (tabs) tabs.innerHTML = `<button class="text-tab active" type="button"><span>${activeFile}</span><span>×</span></button>`;
  const stack = q(root, ".editor-stack");
  if (stack) {
    qa(stack, ".exact-code-mirror").forEach((node) => node.remove());
    setHidden(id(root, "latexSource"), true);
    stack.insertAdjacentHTML("afterbegin", latexCode(activeFile === "model_architecture.tex"));
  }
  const viewer = id(root, "pdfViewer");
  if (viewer) viewer.innerHTML = pdfPage();
  setText(id(root, "pdfTitle"), "main.pdf");
  setText(id(root, "pdfMeta"), "15 pages");
  setText(id(root, "pdfZoomLabel"), "87%");
  setText(id(root, "pdfPageIndicator"), "Page 1 / 15");
  setText(id(root, "compileLog"), "No compile run yet.");
};

const showVisual = (root) => {
  setHidden(q(root, ".exact-code-mirror"), true);
  const visual = id(root, "visualEditor");
  setHidden(visual, false);
  if (visual) visual.innerHTML = visualDocument;
  id(root, "sourceModeButton")?.classList.remove("active");
  id(root, "visualModeButton")?.classList.add("active");
};

const showCompile = (root, state) => {
  const button = id(root, "compileButton");
  if (state === "working") {
    setText(button, "Compiling…");
    button?.classList.add("stale");
    setText(id(root, "compileState"), "Compiling...");
    setText(id(root, "topSaveStatusLabel"), "Saving...");
    setText(id(root, "compileLog"), "Running tectonic ms.tex...");
  } else {
    setText(button, "Compile");
    button?.classList.remove("stale");
    setText(id(root, "compileState"), "Compiled just now");
    setText(id(root, "topSaveStatusLabel"), "Saved");
    setText(id(root, "compileLog"), "Compiled successfully.\nOutput written to main.pdf");
    id(root, "pdfViewer")?.classList.add("pdf-dark-render");
  }
};

const showNotes = (root, draw = false) => {
  const notes = id(root, "notesPanel");
  notes?.classList.add("notes-open");
  id(root, "notesModeTextButton")?.classList.toggle("active", !draw);
  id(root, "notesModeDrawButton")?.classList.toggle("active", draw);
  setHidden(id(root, "notesToolbar"), draw);
  setHidden(id(root, "notesText"), draw);
  setHidden(id(root, "notesPreview"), draw);
  const canvasWrap = id(root, "notesCanvasWrap");
  setHidden(canvasWrap, !draw);
  const canvas = id(root, "notesCanvas");
  if (!draw) {
    setValue(id(root, "notesText"), "# Review checklist\n\n- compare attention heads\n- rerun ablation table\n- update Figure 3");
  }
  if (draw && canvasWrap) canvasWrap.insertAdjacentHTML("beforeend", `<svg class="exact-notes-drawing" viewBox="0 0 320 680"><path d="M32 90 C95 35 170 160 280 78 M55 250 C130 180 218 205 275 300 M75 420 L245 420 M160 335 L160 520"></path><text x="60" y="560">cross-attention</text></svg>`);
};

const showPdfReader = (root, localFrame) => {
  prepareEditor(root, {activeFile: "ms.tex"});
  root.classList.add("exact-pdf-reader");
  id(root, "workspace")?.classList.add("pdf-reader-mode");
  id(root, "pdfReaderButton")?.setAttribute("aria-pressed", "true");
  const playing = localFrame >= 66;
  const speechControls = id(root, "pdfSpeechControls");
  speechControls?.classList.remove("exact-expanded");
  if (speechControls) speechControls.dataset.state = playing ? "playing" : "ready";
  const highlight = playing ? Math.min(7, Math.floor(Math.max(0, localFrame - 66) / 12)) : -1;
  const viewer = id(root, "pdfViewer");
  if (viewer) viewer.innerHTML = pdfPage({highlight});
  setText(id(root, "pdfSpeechStatus"), playing ? "Kokoro reading" : "Bella ready · 5,079 words");
  const speechRate = 1;
  const elapsedSeconds = playing ? Math.floor(((localFrame - 66) / 30) * speechRate) : 0;
  setText(id(root, "pdfSpeechProgressCurrent"), `0:${String(elapsedSeconds).padStart(2, "0")}`);
  setText(id(root, "pdfSpeechProgressTotal"), "/ 08:42");
  qa(speechControls, ".pdf-speech-wave i").forEach((bar, index) => {
    const phase = Math.max(0, localFrame - 66) * .28 + index * 1.8;
    bar.style.height = playing ? `${Math.round(6 + 7 * (.5 + Math.sin(phase) / 2))}px` : "5px";
  });
  const speech = id(root, "pdfSpeechButton");
  if (speech) {
    speech.disabled = false;
    speech.setAttribute("aria-pressed", String(playing));
  }
};

const showPython = (root, localFrame) => {
  const notebook = false;
  const activeFile = notebook ? "analysis.ipynb" : "analysis.py";
  prepareEditor(root, {activeFile});
  setHidden(id(root, "pythonRuntimeControls"), false);
  setHidden(id(root, "pythonEditorToolbar"), notebook);
  const outputVisible = localFrame >= 48;
  q(root, ".source-pane")?.classList.add("python-file-active");
  q(root, ".preview-pane")?.classList.toggle("python-output-active", outputVisible);
  q(root, ".preview-pane")?.classList.add("python-file-preview");
  setHidden(q(root, ".preview-pane .pane-header"), outputVisible);
  setHidden(id(root, "pdfViewerShell"), outputVisible);
  setHidden(id(root, "compileLogPanel"), outputVisible);
  setHidden(id(root, "pythonNotebookPanel"), !outputVisible);
  if (outputVisible) {
    id(root, "workspace")?.classList.add("python-terminal-wide");
    id(root, "workspace")?.appendChild(id(root, "terminalPanel"));
  }
  setText(id(root, "ipynbKernelLabel"), "Python 3.12 · .venv");
  const ran = localFrame >= 48;
  const ranAll = localFrame >= 115;
  if (notebook) {
    setHidden(q(root, ".exact-code-mirror"), true);
    const notebookEditor = id(root, "ipynbNotebookEditor");
    setHidden(notebookEditor, false);
    if (notebookEditor) notebookEditor.innerHTML = notebookMarkup(ranAll);
  } else {
    const code = q(root, ".exact-code-content");
    if (code) code.innerHTML = [
      "import numpy as np", "import matplotlib.pyplot as plt", "", "epochs = np.arange(1, 25)", "accuracy = 1 - np.exp(-epochs / 8)", "", `plt.plot(epochs, accuracy)`, `plt.title(\"Validation accuracy\")`,
    ].map((line, index) => codeLine(index + 1, `<span class="cm-variable">${line}</span>`)).join("");
  }
  setText(q(root, ".python-notebook-heading h2"), ran || ranAll ? "Python 3.12 · Ready" : "Python 3.12");
  const feed = id(root, "pythonNotebookFeed");
  if (feed) feed.innerHTML = ran || ranAll ? pythonChart(ease(interpolate(localFrame, [48, 74], [0, 1], clamp))) : `<div class="terminal-empty">Run a cell to see rich Python output.</div>`;
  if (localFrame >= 140) {
    const menu = id(root, "pythonKernelMenu");
    setHidden(menu, false);
    if (menu) menu.innerHTML = `<button class="active">✓ Python 3.12 · .venv</button><button>Python 3.11 · system</button><button>Connect to kernel…</button>`;
  }
};

const showPresentation = (root, localFrame) => {
  if (localFrame < 30) {
    fillProjectScreen(root);
    return;
  }
  setHidden(id(root, "presentationScreen"), false);
  setText(id(root, "pptxProjectTitle"), "Quarterly Research");
  setText(id(root, "pptxSlideCount"), "3");
  const second = localFrame >= 104;
  const selected = localFrame >= 55 && localFrame < 104;
  const chart = localFrame >= 85;
  setText(id(root, "pptxStageLabel"), `Slide ${second ? 2 : 1}`);
  setText(id(root, "pptxStatusSlide"), `Slide ${second ? 2 : 1} of 3`);
  setText(id(root, "pptxZoomOutput"), "84%");
  const tree = id(root, "pptxFileTree");
  if (tree) tree.innerHTML = fileRow("Quarterly Research.pptx", true, 0, "PPT") + fileRow("growth.png", false, 0, "IMG") + fileRow("results.csv", false, 0, "CSV");
  const list = id(root, "pptxSlideList");
  if (list) list.innerHTML = slideThumb(1, "Overview", !second) + slideThumb(2, "Results", second) + slideThumb(3, "Roadmap", false);
  const canvas = id(root, "pptxSlideCanvas");
  if (canvas) canvas.innerHTML = slideCanvas({second, selected, chart});
  setHidden(id(root, "pptxContextToolbar"), !selected);
  if (localFrame >= 145) {
    id(root, "presentationScreen")?.classList.add("pptx-presenting");
    setHidden(id(root, "pptxPresentControls"), false);
    setText(id(root, "pptxPresentStatus"), "2 / 3");
  }
};

const showTerminals = (root, localFrame) => {
  prepareEditor(root, {activeFile: "model_architecture.tex"});
  const panel = id(root, "terminalPanel");
  if (localFrame < 25) return;
  q(root, ".source-pane")?.classList.remove("terminal-collapsed");
  const codex = localFrame >= 62;
  const claude = localFrame >= 104;
  const split = localFrame >= 142;
  const tabs = id(root, "terminalTabs");
  if (tabs) tabs.innerHTML = `<button class="terminal-tab" type="button"><span class="terminal-tab-kind">&gt;</span><span class="terminal-tab-title">Shell 1</span></button>${codex ? `<button class="terminal-tab ${!claude ? "active" : ""}" type="button"><span class="terminal-tab-kind terminal-tab-kind-codex">◉</span><span class="terminal-tab-title">Codex 1</span></button>` : ""}${claude ? `<button class="terminal-tab active" type="button"><span class="terminal-tab-kind terminal-tab-kind-claude">A</span><span class="terminal-tab-title">Claude 1</span></button>` : ""}`;
  const body = id(root, "terminalBody");
  if (body) {
    body.classList.toggle("terminal-split", split);
    body.innerHTML = codex ? terminalPane("Codex", localFrame >= 82) + (claude ? terminalPane("Claude", localFrame >= 125) : "") : terminalPane("Shell", true);
  }
};

const showHistoryAndGit = (root, localFrame) => {
  prepareEditor(root, {activeFile: "model_architecture.tex"});
  if (localFrame >= 25 && localFrame < 83) {
    const panel = id(root, "historyPanel");
    setHidden(panel, false);
    q(root, ".preview-pane")?.classList.add("history-open");
    const selected = localFrame >= 52 ? 1 : 0;
    const body = id(root, "historyPanelBody");
    if (body) body.innerHTML = `<div class="history-entry-list" role="listbox"><button class="history-entry ${selected === 0 ? "active" : ""}"><strong>Just now</strong><span>Current version</span><small>model_architecture.tex · +14 -3</small></button><button class="history-entry ${selected === 1 ? "active" : ""}"><strong>18 min ago</strong><span>Update Figure 3 reference</span><small>model_architecture.tex · +6 -2</small></button><button class="history-entry"><strong>Yesterday</strong><span>Camera-ready baseline</span><small>ms.tex · +82 -41</small></button></div><article class="history-document-preview"><header><strong>${selected ? "Update Figure 3 reference" : "Current version"}</strong><span>${selected ? "18 min ago" : "Just now"}</span></header><pre>\\subsection{Attention}\n\\subsubsection{Multi-Head Attention}\nMulti-head attention allows the model to jointly attend to\ninformation from different representation subspaces.\n\\includegraphics{Figures/ModalNet-20}</pre></article>`;
  }
  if (localFrame >= 96) {
    setText(id(root, "topSaveStatusLabel"), localFrame < 108 ? "Pushing..." : "Saved");
    setText(id(root, "compileState"), localFrame < 108 ? "Pushing to GitHub..." : "Pushed LaTeX sources (8ac4f21)");
    setText(id(root, "compileLog"), localFrame < 108 ? "Preparing LaTeX sources..." : "Pushed original paper sources to https://github.com/axel-slid/openleaf-latex-documents/attention-is-all-you-need.\n\nms.tex\nintroduction.tex\nmodel_architecture.tex\nresults.tex\nnips_2017.sty");
    id(root, "compileLogPanel")?.classList.remove("log-collapsed");
  }
};

const showRemote = (root, localFrame) => {
  if (localFrame < 25) {
    fillProjectScreen(root);
    return;
  }
  if (localFrame < 104) {
    fillProjectScreen(root);
    setHidden(id(root, "settingsBackdrop"), false);
    setHidden(id(root, "sshProjectPanel"), false);
    setValue(id(root, "sshProjectUserInput"), "alex");
    setValue(id(root, "sshProjectHostInput"), "gpu-lab.edu");
    setValue(id(root, "sshProjectPathInput"), "~/research/transformer-study");
    if (localFrame >= 58) {
      setText(id(root, "sshProjectStatus"), localFrame < 82 ? "Authenticating SSH connection..." : "SSH authentication succeeded. Verifying remote path...");
      setHidden(id(root, "sshAuthTerminalShell"), false);
      const terminal = id(root, "sshAuthTerminal");
      if (terminal) terminal.innerHTML = `<pre><span>$</span> ssh alex@gpu-lab.edu\n<span>✓</span> public key accepted\n<span>✓</span> remote path verified</pre>`;
    }
    return;
  }
  prepareEditor(root, {activeFile: "ms.tex", remote: true});
  setText(id(root, "compileState"), "Remote workspace ready");
  const panel = id(root, "terminalPanel");
  q(root, ".source-pane")?.classList.remove("terminal-collapsed");
  const body = id(root, "terminalBody");
  if (body) body.innerHTML = `<div class="terminal-instance exact-terminal-instance"><pre><b>SSH · alex@gpu-lab.edu</b>\n<span class="muted">~/research/attention-is-all-you-need</span>\n\n<span class="prompt">$</span> git pull\nAlready up to date.\n<span class="prompt">$</span> tectonic ms.tex\n<span class="success">Compiled main.pdf</span></pre></div>`;
  const tabs = id(root, "terminalTabs");
  if (tabs) tabs.innerHTML = `<button class="terminal-tab active"><span class="terminal-tab-kind">SSH</span><span class="terminal-tab-title">SSH 1</span></button>`;
};

const showSettings = (root, localFrame) => {
  prepareEditor(root, {activeFile: "ms.tex"});
  if (localFrame < 25) return;
  setHidden(id(root, "settingsBackdrop"), false);
  setHidden(id(root, "settingsDrawer"), false);
  const section = localFrame < 42 ? "workspace" : localFrame < 82 ? "appearance" : "agents";
  qa(root, ".settings-nav-button[data-settings-section]").forEach((button) => button.classList.toggle("active", button.dataset.settingsSection === section));
  qa(root, "[data-settings-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === section));
  setText(id(root, "settingsTitle"), section === "workspace" ? "Workspace" : section === "appearance" ? "Appearance" : "AGENTS.md");
  if (section === "workspace") {
    id(root, "autoCompileToggle").checked = localFrame >= 25;
    id(root, "autoSaveToggle").checked = true;
    id(root, "settingsFileSidebarToggle").checked = true;
    id(root, "settingsMinimapToggle").checked = true;
  }
  if (section === "appearance") {
    setValue(id(root, "settingsThemePreset"), "dark-plus");
    id(root, "settingsThemeToggle").checked = true;
    const choices = qa(root, "#settingsPdfRenderMode button");
    choices.forEach((button) => button.classList.toggle("active", button.dataset.pdfRenderMode === (localFrame >= 66 ? "adaptive" : "original")));
  }
  if (section === "agents") {
    setValue(id(root, "agentsEditor"), "# Openleaf project instructions\n\n- compile ms.tex after edits\n- preserve the original nips_2017 style\n- keep figures inside /Figures\n- run Python checks before committing\n- report LaTeX warnings");
    setText(id(root, "agentsStatus"), localFrame >= 112 ? "AGENTS.md saved." : "AGENTS.md loaded.");
  }
};

const syncApp = (root, frame) => {
  resetApp(root);
  if (frame < 150) {
    if (frame >= 38 && frame < 98) showNewProject(root);
    else if (frame >= 98) prepareEditor(root, {activeFile: "ms.tex"});
    else fillEmptyProjectScreen(root);
    return;
  }
  if (frame < 440) {
    const local = frame - 150;
    prepareEditor(root, {activeFile: "ms.tex"});
    if (local >= 48 && local < 91) showVisual(root);
    if (local >= 132 && local < 158) showCompile(root, "working");
    if (local >= 158) showCompile(root, "done");
    if (local >= 205) showNotes(root, local >= 245);
    return;
  }
  if (frame < 600) return showPdfReader(root, frame - 440);
  if (frame < 760) return showPython(root, frame - 600);
  if (frame < 940) return showPresentation(root, frame - 760);
  if (frame < 1120) return showTerminals(root, frame - 940);
  if (frame < 1240) return showHistoryAndGit(root, frame - 1120);
  if (frame < 1370) return showRemote(root, frame - 1240);
  if (frame < 1500) return showSettings(root, frame - 1370);
  fillEmptyProjectScreen(root);
};

const ACTIONS = [
  {frame: 30, x: 805, y: 246, selector: "#addProjectButton"}, {frame: 70, x: 608, y: 534, selector: "[data-project-kind='blank']"},
  {frame: 190, x: 749, y: 68, selector: "#visualModeButton"}, {frame: 245, x: 672, y: 68, selector: "#sourceModeButton"}, {frame: 281, x: 1012, y: 68, selector: "#compileButton"}, {frame: 346, x: 1899, y: 562, selector: "#notesRailButton"}, {frame: 386, x: 1642, y: 64, selector: "#notesModeDrawButton"},
  {frame: 465, x: 1848, y: 68, selector: "#pdfReaderButton"}, {frame: 505, x: 890, y: 1048, selector: "#pdfSpeechButton"},
  {frame: 625, x: 126, y: 101, selector: "#fileTree .file-item:nth-of-type(1)"}, {frame: 648, x: 291, y: 569, selector: "#pythonRunCellButton"}, {frame: 686, x: 126, y: 125, selector: "#fileTree .file-item:nth-of-type(2)"}, {frame: 716, x: 481, y: 169, selector: "#ipynbNotebookEditor .ipynb-toolbar-actions button:nth-of-type(3)"}, {frame: 744, x: 595, y: 68, selector: "#pythonKernelButton"},
  {frame: 780, x: 765, y: 582, selector: "#projectGrid .project-card:nth-child(2)"}, {frame: 812, x: 1141, y: 442, selector: "#pptxSlideCanvas .exact-slide-title"}, {frame: 842, x: 490, y: 98, selector: "#pptxAddChartButton"}, {frame: 870, x: 277, y: 347, selector: "#pptxSlideList .pptx-slide-thumb:nth-child(2)"}, {frame: 902, x: 1871, y: 139, selector: "#pptxPresentButton"},
  {frame: 960, x: 565, y: 1066, selector: "#terminalCollapsedButton"}, {frame: 994, x: 572, y: 847, selector: "#terminalCodexButton"}, {frame: 1037, x: 651, y: 847, selector: "#terminalClaudeButton"}, {frame: 1082, x: 726, y: 847, selector: "#terminalSplitButton"},
  {frame: 1142, x: 1579, y: 21, selector: "#historyButton"}, {frame: 1170, x: 933, y: 263, selector: "#historyPanelBody .history-entry:nth-child(2)"}, {frame: 1202, x: 1910, y: 104, selector: "#closeHistoryButton"}, {frame: 1220, x: 1639, y: 21, selector: "#pushGithubButton"},
  {frame: 1258, x: 1004, y: 246, selector: "#remoteWorkspaceButton"}, {frame: 1292, x: 1094, y: 778, selector: "#connectSshProjectButton"},
  {frame: 1386, x: 1821, y: 21, selector: ".settingsButton.topbar-action-button"}, {frame: 1406, x: 1502, y: 331, selector: "#autoCompileToggle"}, {frame: 1446, x: 489, y: 286, selector: "[data-settings-section='appearance']"}, {frame: 1478, x: 489, y: 448, selector: "[data-settings-section='agents']"},
];

const cursorAt = (frame, root = null) => {
  if (frame >= 600 && frame < 760) frame = Math.min(frame, 658);
  if (frame >= 150 && frame < 440) frame = Math.min(frame, 300);
  if (frame >= 790 && frame < 940) frame = Math.min(frame, 910);
  const actions = ACTIONS.map(action => {
    const target = root && q(root, action.selector);
    const rect = target?.getBoundingClientRect();
    return rect?.width && rect?.height ? {...action, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2} : action;
  });
  if (frame <= actions[0].frame) return actions[0];
  for (let index = 1; index < actions.length; index += 1) {
    const previous = actions[index - 1];
    const action = actions[index];
    if (frame <= action.frame) {
      const gap = action.frame - previous.frame;
      const travelFrames = Math.min(5, Math.max(3, Math.round(gap * .25)));
      const p = ease(interpolate(frame, [action.frame - travelFrames, action.frame], [0, 1], clamp));
      return {
        x: interpolate(p, [0, 1], [previous.x, action.x]),
        y: interpolate(p, [0, 1], [previous.y, action.y]),
      };
    }
  }
  return actions[actions.length - 1];
};

const ExactCursor = React.forwardRef(({frame}, ref) => {
  const point = cursorAt(frame);
  const click = ACTIONS.reduce((value, action) => frame < action.frame
    ? value
    : Math.max(value, interpolate(frame - action.frame, [0, 9], [1, 0], clamp)), 0);
  const clickScale = interpolate(click, [0, 1], [1.45, .35], clamp);
  return <div ref={ref} className="twin-cursor exact-cursor" style={{left: point.x, top: point.y}}><span className="twin-click" style={{opacity: click, transform: `scale(${clickScale})`}}/><span className="twin-pointer"/></div>;
});

ExactCursor.displayName = "ExactCursor";

export const OpenleafExactRemotion = ({frameOverride}) => {
  const timelineFrame = useCurrentFrame();
  const frame = frameOverride ?? timelineFrame;
  const rootRef = useRef(null);
  const cursorRef = useRef(null);
  const markup = useMemo(() => ({__html: bodyMarkup}), []);

  useLayoutEffect(() => {
    document.body.dataset.theme = "dark";
    document.body.dataset.themePreset = "dark-plus";
    document.body.classList.add("dark-theme");
    if (rootRef.current) {
      rootRef.current.classList.remove("exact-home");
      syncApp(rootRef.current, frame);
      const point = cursorAt(frame, rootRef.current);
      if (cursorRef.current) {
        cursorRef.current.style.left = `${point.x}px`;
        cursorRef.current.style.top = `${point.y}px`;
      }
    }
    return () => {
      document.body.classList.remove("pdf-reader-mode");
    };
  }, [frame]);

  return <AbsoluteFill className="openleaf-twin exact-remotion-root"><div ref={rootRef} className="exact-app-dom" dangerouslySetInnerHTML={markup}/><ExactCursor ref={cursorRef} frame={frame}/></AbsoluteFill>;
};
