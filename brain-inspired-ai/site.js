(function () {
  const select = document.querySelector("#benchmark-select");
  const accuracyPlot = document.querySelector("#accuracy-plot");
  const efficiencyPlot = document.querySelector("#efficiency-plot");
  const tradeoffPlot = document.querySelector("#tradeoff-plot");
  const chartButtons = [...document.querySelectorAll("[data-chart]")];
  if (!select || !accuracyPlot || !window.Plotly) return;

  const colors = { baseline: "#94a3b8", ours: "#2563eb", accent: "#0ea5e9", stress: "#f59e0b" };
  const isOurs = (name) => /PBN|ours/i.test(name);
  const pct = (value) => `${(value * 100).toFixed(1)}%`;
  const layoutBase = {
    paper_bgcolor: "#ffffff", plot_bgcolor: "#f8fafc", font: { family: "Inter, sans-serif", color: "#172033", size: 12 },
    margin: { l: 58, r: 24, t: 48, b: 58 }, hoverlabel: { bgcolor: "#172033", font: { color: "#fff" } },
    legend: { orientation: "h", y: 1.14, x: 0, bgcolor: "rgba(0,0,0,0)" },
    xaxis: { gridcolor: "#e5eaf2", zeroline: false }, yaxis: { gridcolor: "#e5eaf2", zeroline: false },
  };
  const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

  function selectedData(data) { return data.benchmarks.find((item) => item.id === select.value) || data.benchmarks[0]; }

  function markerFor(name) { return { color: isOurs(name) ? colors.ours : colors.baseline, size: isOurs(name) ? 14 : 11, line: { color: "#fff", width: 1 } }; }

  function drawAccuracy(benchmark) {
    Plotly.react(accuracyPlot, [
      { x: benchmark.models, y: benchmark.clean, name: "Clean", type: "bar", marker: { color: colors.accent }, customdata: benchmark.clean.map(pct), hovertemplate: "%{x}<br>Clean: %{customdata}<extra></extra>" },
      { x: benchmark.models, y: benchmark.stress, name: "Stress", type: "bar", marker: { color: colors.stress }, customdata: benchmark.stress.map(pct), hovertemplate: "%{x}<br>Stress: %{customdata}<extra></extra>" },
    ], { ...layoutBase, barmode: "group", title: { text: `${benchmark.title} · held-out accuracy`, x: 0, font: { size: 16 } }, yaxis: { ...layoutBase.yaxis, title: "Accuracy", tickformat: ".0%", range: [0, 1.06] }, xaxis: { ...layoutBase.xaxis, tickangle: -12 }, annotations: [{ x: benchmark.models.findIndex(isOurs), y: 1.01, xref: "x", yref: "paper", text: "PBN (ours)", showarrow: false, font: { color: colors.ours, size: 11, family: "IBM Plex Mono" } }] }, config);
  }

  function drawEfficiency(benchmark) {
    Plotly.react(efficiencyPlot, [{ x: benchmark.active, y: benchmark.params_m, text: benchmark.models, mode: "markers+text", textposition: "top center", textfont: { size: 10 }, marker: { color: benchmark.models.map((name) => markerFor(name).color), size: benchmark.models.map((name) => markerFor(name).size), line: { color: "#fff", width: 1 } }, customdata: benchmark.models.map((name, i) => [name, pct(benchmark.active[i]), benchmark.params_m[i].toFixed(3)]), hovertemplate: "%{customdata[0]}<br>Active updates: %{customdata[1]}<br>Parameters: %{customdata[2]}M<extra></extra>" }], { ...layoutBase, title: { text: "Selective compute · lower active is less work", x: 0, font: { size: 15 } }, xaxis: { ...layoutBase.xaxis, title: "Active expensive updates", tickformat: ".0%", range: [0, 1.08] }, yaxis: { ...layoutBase.yaxis, title: "Parameters (M)" } }, config);
  }

  function drawTradeoff(data, benchmark) {
    const points = data.benchmarks.flatMap((item) => item.models.map((name, i) => ({ benchmark: item.title, name, stress: item.stress[i], latency: item.latency_ms[i], ours: isOurs(name) })));
    Plotly.react(tradeoffPlot, [{ x: points.map((p) => p.latency), y: points.map((p) => p.stress), text: points.map((p) => `${p.name} · ${p.benchmark}`), mode: "markers", marker: { color: points.map((p) => p.ours ? colors.ours : colors.baseline), size: points.map((p) => p.ours ? 13 : 9), symbol: points.map((p) => p.benchmark === benchmark.title ? "circle" : "diamond"), line: { color: "#fff", width: 1 } }, customdata: points.map((p) => [p.name, p.benchmark, p.latency.toFixed(4), pct(p.stress)]), hovertemplate: "%{customdata[0]}<br>%{customdata[1]}<br>Latency: %{customdata[2]} ms/ex<br>Stress accuracy: %{customdata[3]}<extra></extra>" }], { ...layoutBase, title: { text: "Latency vs. stress accuracy · all protocols", x: 0, font: { size: 15 } }, xaxis: { ...layoutBase.xaxis, title: "Latency (ms / example)", type: "log" }, yaxis: { ...layoutBase.yaxis, title: "Stress accuracy", tickformat: ".0%", range: [0, 1.02] } }, config);
  }

  function render(data) {
    const benchmark = selectedData(data);
    drawAccuracy(benchmark);
    drawEfficiency(benchmark);
    drawTradeoff(data, benchmark);
    document.title = `${benchmark.title} · Brain-Inspired AI | Alex Dils`;
  }

  fetch("../assets/brain-ai/plot-data.json")
    .then((response) => { if (!response.ok) throw new Error("plot data unavailable"); return response.json(); })
    .then((data) => {
      data.benchmarks.forEach((benchmark) => {
        const option = document.createElement("option"); option.value = benchmark.id; option.textContent = `${benchmark.title} — ${benchmark.tag}`; select.append(option);
      });
      select.value = data.benchmarks.find((item) => item.id === "mnist-stream")?.id || data.benchmarks[0].id;
      select.addEventListener("change", () => render(data));
      render(data);
      chartButtons.forEach((button) => button.addEventListener("click", () => { chartButtons.forEach((item) => item.classList.toggle("active", item === button)); document.querySelector(`#${button.dataset.chart}-plot`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }));
    })
    .catch(() => { accuracyPlot.innerHTML = "<p>Interactive evidence is unavailable in this preview. The downloadable paper contains the same saved results.</p>"; });
})();

(function () {
  const button = document.querySelector("[data-copy-bibtex]");
  const code = document.querySelector("#bibtex-code");
  if (!button || !code) return;
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(code.textContent);
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = "Copy"; }, 1500);
  });
})();
