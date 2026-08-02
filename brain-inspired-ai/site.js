(function () {
  const DATA_URL = "../assets/brain-ai/dual-rf-results.json";
  const COLORS = {
    ink: "#13213a",
    muted: "#667085",
    blue: "#2764e7",
    cyan: "#34b7da",
    green: "#168f68",
    orange: "#df862f",
    red: "#b84d56",
    gray: "#98a2b3",
    grid: "#e4e9f1",
  };
  const LABELS = { clean: "Clean", row45: "45% rows missing", block35: "35% block missing", pixel45: "45% pixels missing" };
  const DATASET_LABELS = { mnist: "MNIST", cifar10: "CIFAR-10", fashion: "Fashion-MNIST" };
  const plotConfig = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"] };
  const layoutBase = {
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    font: { family: "Inter, sans-serif", color: COLORS.ink, size: 11 },
    margin: { l: 62, r: 30, t: 48, b: 58 },
    hoverlabel: { bgcolor: COLORS.ink, bordercolor: COLORS.ink, font: { color: "#fff" } },
    xaxis: { gridcolor: COLORS.grid, zeroline: false, linecolor: "#cfd7e3" },
    yaxis: { gridcolor: COLORS.grid, zeroline: false, linecolor: "#cfd7e3" },
  };

  const percent = (value, digits = 1) => `${(100 * value).toFixed(digits)}%`;
  const points = (value, digits = 2) => `${value >= 0 ? "+" : ""}${(100 * value).toFixed(digits)} pp`;
  const compactLayout = () => window.innerWidth < 700;

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function heatColor(value) {
    const stops = [
      [0.00, [6, 17, 31]],
      [0.22, [31, 72, 118]],
      [0.48, [38, 148, 177]],
      [0.72, [109, 202, 145]],
      [1.00, [250, 191, 83]],
    ];
    const v = Math.max(0, Math.min(1, value));
    let left = stops[0];
    let right = stops[stops.length - 1];
    for (let index = 1; index < stops.length; index += 1) {
      if (v <= stops[index][0]) { left = stops[index - 1]; right = stops[index]; break; }
    }
    const mix = (v - left[0]) / Math.max(1e-9, right[0] - left[0]);
    return left[1].map((channel, index) => Math.round(channel + mix * (right[1][index] - channel)));
  }

  function drawMatrix(canvas, matrix, kind) {
    if (!canvas || !matrix) return;
    const rows = matrix.length;
    const columns = matrix[0].length;
    const buffer = document.createElement("canvas");
    buffer.width = columns;
    buffer.height = rows;
    const context = buffer.getContext("2d");
    const image = context.createImageData(columns, rows);
    let offset = 0;
    matrix.forEach((row) => row.forEach((raw) => {
      let color;
      if (kind === "radius") {
        color = raw <= 0 ? [8, 19, 33] : heatColor(raw / 15);
      } else {
        const value = Math.max(0, Math.min(1, raw));
        const level = Math.round(8 + value * 242);
        color = [level, Math.round(level * 0.98), Math.min(255, Math.round(level * 1.04))];
      }
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
      offset += 4;
    }));
    context.putImageData(image, 0, 0);
    const target = canvas.getContext("2d");
    target.imageSmoothingEnabled = false;
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  }

  function setupFieldLab(data) {
    const demo = data.demo;
    if (!demo) return;
    const conditionButtons = [...document.querySelectorAll("[data-demo-condition]")];
    const observed = document.querySelector("#observed-canvas");
    const completed = document.querySelector("#completed-canvas");
    const radius = document.querySelector("#radius-canvas");
    const slider = document.querySelector("#route-capacity");
    const packetHolder = document.querySelector("#route-packets");
    let condition = "row45";

    function renderCondition() {
      const sample = demo.cases[condition];
      drawMatrix(observed, sample.sensory, "gray");
      drawMatrix(completed, sample.completed, "gray");
      drawMatrix(radius, sample.radius, "radius");
      conditionButtons.forEach((button) => button.classList.toggle("active", button.dataset.demoCondition === condition));
    }

    conditionButtons.forEach((button) => button.addEventListener("click", () => {
      condition = button.dataset.demoCondition;
      renderCondition();
    }));

    const packetOrder = Array.from({ length: 64 }, (_, index) => index).sort((a, b) => {
      const hash = (value) => Math.sin(value * 12.9898 + 78.233) * 43758.5453 % 1;
      return hash(a) - hash(b);
    });
    if (packetHolder) {
      for (let index = 0; index < 64; index += 1) packetHolder.append(document.createElement("i"));
    }
    function renderRoute() {
      const capacity = Number(slider?.value || 25);
      const count = Math.round(64 * capacity / 100);
      const active = new Set(packetOrder.slice(0, count));
      [...(packetHolder?.children || [])].forEach((packet, index) => packet.classList.toggle("active", active.has(index)));
      setText("#route-output", `${capacity}%`);
      setText("#route-count", `${count} / 64 examples`);
    }
    slider?.addEventListener("input", renderRoute);
    renderCondition();
    renderRoute();
  }

  function effectPlot(study, condition) {
    const holder = document.querySelector("#effect-plot");
    if (!holder || !window.Plotly) return;
    const compact = compactLayout();
    const yRange = study.dataset === "cifar10" ? [0.35, 0.86] : [0.60, 1.005];
    const modelLabels = compact
      ? ["Masked<br>Swin", "Adaptive Dual-RF (ours)<br>25% stage"]
      : ["Masked Swin V2-Tiny", "Adaptive Dual-RF (ours) · 25% stage"];
    const row = study.conditions[condition];
    const baseline = row.baseline.values;
    const ours = row.dual_rf_route25.values;
    const traces = study.seeds.map((seed, index) => ({
      x: modelLabels,
      y: [baseline[index], ours[index]],
      mode: "lines+markers",
      name: `seed ${seed}`,
      line: { color: "#c4ccd8", width: 2 },
      marker: { color: [COLORS.gray, COLORS.blue], size: 10, line: { color: "#fff", width: 1 } },
      customdata: [[seed, "baseline"], [seed, "ours"]],
      hovertemplate: "Seed %{customdata[0]}<br>%{x}<br>Accuracy: %{y:.2%}<extra></extra>",
      showlegend: false,
    }));
    traces.push({
      x: modelLabels,
      y: [row.baseline.mean, row.dual_rf_route25.mean],
      mode: "markers",
      name: "mean",
      marker: { color: [COLORS.ink, COLORS.blue], size: 17, symbol: "diamond", line: { color: "#fff", width: 1.5 } },
      error_y: {
        type: "data",
        symmetric: false,
        array: [row.baseline.ci95_high - row.baseline.mean, row.dual_rf_route25.ci95_high - row.dual_rf_route25.mean],
        arrayminus: [row.baseline.mean - row.baseline.ci95_low, row.dual_rf_route25.mean - row.dual_rf_route25.ci95_low],
        color: COLORS.ink,
        thickness: 1.2,
        width: 5,
      },
      hovertemplate: "%{x}<br>Mean: %{y:.2%}<extra></extra>",
      showlegend: false,
    });
    Plotly.react(holder, traces, {
      ...layoutBase,
      margin: { l: compact ? 49 : 62, r: compact ? 10 : 30, t: 48, b: compact ? 76 : 58 },
      title: { text: `${DATASET_LABELS[study.dataset] || study.dataset.toUpperCase()} · ${LABELS[condition]} · ${points(row.paired_gain_route25.mean)} paired mean`, x: 0.02, font: { size: compact ? 14 : 17 } },
      yaxis: { ...layoutBase.yaxis, title: "Held-out accuracy", tickformat: ".0%", range: yRange },
      xaxis: { ...layoutBase.xaxis, tickfont: { size: 11 } },
      annotations: [{
        x: 1, y: yRange[0] + 0.02, xref: "paper", yref: "y", xanchor: "right",
        text: `${study.seeds.length} paired seeds · error bars: 95% t interval`, showarrow: false,
        font: { size: 9, color: COLORS.muted },
      }],
    }, plotConfig);
  }

  function severeForSeed(route, index) {
    return (route.conditions.row45.values[index] + route.conditions.block35.values[index] + route.conditions.pixel45.values[index]) / 3;
  }

  function drawPareto(study) {
    const holder = document.querySelector("#pareto-plot");
    if (!holder || !window.Plotly) return;
    const compact = compactLayout();
    const seedX = [];
    const seedY = [];
    const seedText = [];
    study.routes.forEach((route) => study.seeds.forEach((seed, index) => {
      if (route.latency_ms.values[index] === undefined) return;
      seedX.push(route.latency_ms.values[index]);
      seedY.push(severeForSeed(route, index));
      seedText.push(`seed ${seed} · ${Math.round(100 * route.fraction)}%`);
    }));
    const meanX = study.routes.map((route) => route.latency_ms.mean);
    const meanY = study.routes.map((route) => (route.conditions.row45.mean + route.conditions.block35.mean + route.conditions.pixel45.mean) / 3);
    const baselineY = study.seeds.map((_, index) => (
      study.conditions.row45.baseline.values[index] + study.conditions.block35.baseline.values[index] + study.conditions.pixel45.baseline.values[index]
    ) / 3);
    Plotly.react(holder, [
      { x: seedX, y: seedY, text: seedText, mode: "markers", marker: { color: "rgba(39,100,231,.24)", size: 8 }, hovertemplate: "%{text}<br>%{x:.3f} ms/ex<br>%{y:.2%}<extra></extra>", showlegend: false },
      { x: meanX, y: meanY, text: study.routes.map((route) => `${Math.round(100 * route.fraction)}%`), mode: "lines+markers+text", textposition: "top center", name: "Adaptive Dual-RF (ours)", line: { color: COLORS.blue, width: 2 }, marker: { size: 12, color: COLORS.blue, line: { color: "white", width: 1 } }, hovertemplate: "Adaptive Dual-RF · %{text} final stage<br>%{x:.3f} ms/ex<br>%{y:.2%}<extra></extra>" },
      { x: study.latency.baseline_dense.values, y: baselineY, text: study.seeds.map((seed) => `seed ${seed}`), mode: "markers", name: "Masked Swin", marker: { size: 10, color: COLORS.ink, symbol: "square" }, hovertemplate: "Masked Swin · %{text}<br>%{x:.3f} ms/ex<br>%{y:.2%}<extra></extra>" },
      { x: [study.latency.baseline_dense.mean], y: [baselineY.reduce((sum, value) => sum + value, 0) / baselineY.length], mode: "markers", marker: { size: 16, color: COLORS.ink, symbol: "square", line: { color: "white", width: 1 } }, hovertemplate: "Masked Swin mean<br>%{x:.3f} ms/ex<br>%{y:.2%}<extra></extra>", showlegend: false },
    ], {
      ...layoutBase,
      margin: { l: compact ? 50 : 58, r: compact ? 10 : 22, t: 20, b: compact ? 66 : 55 },
      xaxis: { ...layoutBase.xaxis, title: "Measured latency (ms / example)" },
      yaxis: { ...layoutBase.yaxis, title: "Mean severe-mask accuracy", tickformat: ".0%" },
      legend: { orientation: "h", y: 1.12, x: 0, font: { size: 9 } },
    }, plotConfig);
  }

  function drawRouter(study) {
    const holder = document.querySelector("#router-plot");
    if (!holder || !window.Plotly) return;
    const compact = compactLayout();
    const conditions = ["row45", "block35", "pixel45"];
    const styles = {
      entropy: { label: "Entropy", color: COLORS.blue, symbol: "circle" },
      random: { label: "Random", color: COLORS.gray, symbol: "diamond" },
      oracle: { label: "Oracle (labels)", color: COLORS.orange, symbol: "star" },
    };
    const traces = Object.entries(styles).map(([kind, style]) => ({
      x: conditions.map((condition) => LABELS[condition].replace(" missing", "")),
      y: conditions.map((condition) => study.controls[condition][kind]?.mean),
      mode: "lines+markers",
      name: style.label,
      line: { color: style.color, width: kind === "entropy" ? 2.2 : 1.4, dash: kind === "random" ? "dot" : "solid" },
      marker: { color: style.color, symbol: style.symbol, size: kind === "oracle" ? 11 : 9 },
      hovertemplate: `${style.label}<br>%{x}<br>Accuracy: %{y:.2%}<extra></extra>`,
    }));
    Plotly.react(holder, traces, {
      ...layoutBase,
      margin: { l: compact ? 50 : 58, r: compact ? 10 : 22, t: 20, b: compact ? 80 : 70 },
      xaxis: { ...layoutBase.xaxis, tickangle: -10 },
      yaxis: { ...layoutBase.yaxis, title: "Accuracy at 25% capacity", tickformat: ".0%" },
      legend: { orientation: "h", y: 1.13, x: 0, font: { size: 9 } },
    }, plotConfig);
  }

  function drawCompletionControl(data) {
    const holder = document.querySelector("#completion-plot");
    const panel = holder?.closest(".completion-panel");
    const study = data.studies["swin-cifar10"];
    const control = study?.single_scale_control;
    if (!holder || !window.Plotly || !study || !control) {
      if (panel) panel.hidden = true;
      return;
    }
    const compact = compactLayout();
    const conditions = ["clean", "row45", "block35", "pixel45"];
    const series = [
      {
        name: "Masked Swin",
        color: COLORS.ink,
        symbol: "square",
        offset: -0.22,
        values: conditions.map((condition) => study.conditions[condition].baseline),
      },
      {
        name: "Local Dual-RF (ours)",
        color: COLORS.green,
        symbol: "diamond",
        offset: 0,
        values: conditions.map((condition) => control.conditions[condition].route25),
      },
      {
        name: "Adaptive Dual-RF (ours)",
        color: COLORS.blue,
        symbol: "circle",
        offset: 0.22,
        values: conditions.map((condition) => study.conditions[condition].dual_rf_route25),
      },
    ];
    const traces = [];
    series.forEach((row) => {
      const seedX = [];
      const seedY = [];
      const seedText = [];
      row.values.forEach((value, conditionIndex) => value.values.forEach((accuracy, seedIndex) => {
        seedX.push(conditionIndex + row.offset);
        seedY.push(accuracy);
        seedText.push(`seed ${study.seeds[seedIndex]}`);
      }));
      traces.push({
        type: "scatter",
        mode: "markers",
        x: seedX,
        y: seedY,
        text: seedText,
        marker: { color: row.color, size: 6, opacity: 0.34, symbol: row.symbol },
        hovertemplate: `${row.name}<br>%{text}<br>Accuracy: %{y:.2%}<extra></extra>`,
        showlegend: false,
      });
      traces.push({
        type: "scatter",
        mode: "markers",
        name: row.name,
        x: conditions.map((_, index) => index + row.offset),
        y: row.values.map((value) => value.mean),
        marker: { color: row.color, size: 13, symbol: row.symbol, line: { color: "white", width: 1.2 } },
        error_y: {
          type: "data",
          symmetric: false,
          array: row.values.map((value) => value.ci95_high - value.mean),
          arrayminus: row.values.map((value) => value.mean - value.ci95_low),
          color: row.color,
          thickness: 1.4,
          width: 4,
        },
        customdata: row.values.map((value) => value.values.map((item) => percent(item, 2)).join(" · ")),
        hovertemplate: `${row.name}<br>Mean: %{y:.2%}<br>Seeds: %{customdata}<extra></extra>`,
      });
    });
    const annotations = compact ? [] : conditions.map((condition, index) => ({
      x: index,
      y: 0.855,
      xref: "x",
      yref: "y",
      text: `adaptive − local: ${points(control.conditions[condition].adaptive_gain.mean)}`,
      showarrow: false,
      font: { color: control.conditions[condition].adaptive_gain.mean > 0 ? COLORS.blue : COLORS.muted, size: 9 },
    }));
    Plotly.react(holder, traces, {
      ...layoutBase,
      margin: { l: compact ? 50 : 62, r: compact ? 10 : 25, t: compact ? 25 : 42, b: compact ? 92 : 72 },
      xaxis: {
        ...layoutBase.xaxis,
        tickmode: "array",
        tickvals: conditions.map((_, index) => index),
        ticktext: conditions.map((condition) => LABELS[condition]),
        tickangle: compact ? -24 : -10,
        tickfont: { size: compact ? 9 : 11 },
        range: [-0.55, 3.55],
      },
      yaxis: { ...layoutBase.yaxis, title: "Held-out accuracy", tickformat: ".0%", range: [0.35, 0.88] },
      legend: { orientation: "h", y: 1.13, x: 0, font: { size: 9 } },
      annotations,
    }, plotConfig);
  }

  function drawReplication(data) {
    const holder = document.querySelector("#replication-plot");
    if (!holder || !window.Plotly) return;
    const compact = compactLayout();
    const conditionOrder = ["clean", "row45", "block35", "pixel45"];
    const studyOrder = { "swin-cifar10": 0, "swin-mnist": 1, "convnext-mnist": 2 };
    const studyRows = Object.values(data.studies)
      .filter((study) => study.conditions && study.conditions.clean)
      .sort((left, right) => (studyOrder[left.id] ?? 99) - (studyOrder[right.id] ?? 99));
    const z = studyRows.map((study) => conditionOrder.map((condition) => {
      const row = study.conditions[condition];
      const gain = row.paired_gain_route25 || row.paired_gain_route50 || row.paired_gain_dense;
      return 100 * gain.mean;
    }));
    Plotly.react(holder, [{
      z,
      x: conditionOrder.map((condition) => LABELS[condition]),
      y: studyRows.map((study) => `${compact ? study.title.replace("Swin V2-Tiny", "Swin").replace("ConvNeXt-style", "ConvNeXt") : study.title} · n=${study.seeds.length}`),
      type: "heatmap",
      zmid: 0,
      colorscale: [[0, "#b84d56"], [0.5, "#f7f8fb"], [1, "#2764e7"]],
      colorbar: { title: { text: "paired<br>gain (pp)", side: "right" }, thickness: 11, len: .75 },
      text: z.map((row) => row.map((value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`)),
      texttemplate: "%{text}",
      textfont: { size: 10 },
      hovertemplate: "%{y}<br>%{x}<br>Paired gain: %{z:+.2f} pp<extra></extra>",
    }], {
      ...layoutBase,
      margin: { l: compact ? 103 : 170, r: compact ? 16 : 35, t: 20, b: compact ? 98 : 65 },
      xaxis: { ...layoutBase.xaxis, side: "bottom", tickangle: compact ? -28 : -10, tickfont: { size: compact ? 9 : 11 } },
      yaxis: { ...layoutBase.yaxis, autorange: "reversed" },
    }, plotConfig);
  }

  function renderHeadline(study, boundaryStudy) {
    setText("#stat-row-gain", points(study.conditions.row45.paired_gain_route25.mean, 1));
    setText("#stat-speedup", `−${(100 * study.latency.paired_speedup_fraction.mean).toFixed(1)}%`);
    const parameterValues = Object.values(study.parameters || {});
    const equal = parameterValues.length > 1 && parameterValues.every((value) => value === parameterValues[0]);
    setText("#stat-params", equal ? "exactly equal" : "near-matched");
    setText("#stat-block-gain", points(boundaryStudy.conditions.block35.paired_gain_route25.mean, 1));
    setText("#protocol-seeds", `${study.seeds.length} seeds · ${study.seeds.join(" / ")}`);
  }

  function setupResults(data) {
    const mnistStudy = data.studies["swin-mnist"];
    const cifarStudy = data.studies["swin-cifar10"];
    if (!mnistStudy) return;
    let study = cifarStudy || mnistStudy;
    renderHeadline(study, mnistStudy);
    let condition = "row45";
    const buttons = [...document.querySelectorAll("[data-effect-condition]")];
    const studyButtons = [...document.querySelectorAll("[data-effect-study]")];
    const renderEffect = () => {
      effectPlot(study, condition);
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.effectCondition === condition));
      studyButtons.forEach((button) => button.classList.toggle("active", button.dataset.effectStudy === study.id));
      setText("#protocol-seeds", `${DATASET_LABELS[study.dataset] || study.dataset.toUpperCase()} · ${study.seeds.length} seeds · ${study.seeds.join(" / ")}`);
    };
    buttons.forEach((button) => button.addEventListener("click", () => { condition = button.dataset.effectCondition; renderEffect(); }));
    studyButtons.forEach((button) => button.addEventListener("click", () => {
      const candidate = data.studies[button.dataset.effectStudy];
      if (candidate) { study = candidate; renderEffect(); }
    }));
    renderEffect();
    drawPareto(mnistStudy);
    drawRouter(mnistStudy);
    drawCompletionControl(data);
    drawReplication(data);
  }

  function showPlotFallback() {
    const effect = document.querySelector("#effect-plot");
    if (effect) effect.innerHTML = '<img class="plot-fallback" src="../assets/brain-ai/paired-swin-effects.png" alt="Static paired Swin effect plot" />';
    ["#pareto-plot", "#router-plot", "#completion-plot", "#replication-plot"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.innerHTML = "<p class=\"plot-error\">Interactive data could not load. The paper PDF contains the saved result tables.</p>";
    });
  }

  fetch(DATA_URL)
    .then((response) => { if (!response.ok) throw new Error(`data request failed: ${response.status}`); return response.json(); })
    .then((data) => {
      setupFieldLab(data);
      if (window.Plotly) setupResults(data); else showPlotFallback();
    })
    .catch((error) => { console.error(error); showPlotFallback(); });

  const copyButton = document.querySelector("[data-copy-bibtex]");
  const bibtex = document.querySelector("#bibtex-code");
  copyButton?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(bibtex?.textContent || "");
    copyButton.textContent = "Copied";
    setTimeout(() => { copyButton.textContent = "Copy"; }, 1400);
  });
})();
