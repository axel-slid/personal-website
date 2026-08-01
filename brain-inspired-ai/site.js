(async function () {
  const grid = document.querySelector("[data-results-grid]");
  if (!grid) return;
  const filters = [...document.querySelectorAll("[data-filter]")];

  function render(items, filter) {
    const visible = filter === "all" ? items : items.filter((item) => item.category === filter);
    grid.innerHTML = "";
    visible.forEach((item) => {
      const card = document.createElement("article");
      card.className = "result-card";
      const image = document.createElement("img");
      image.src = "../" + item.src;
      image.alt = `${item.title}: ${item.metric}`;
      image.loading = "lazy";
      image.decoding = "async";
      const copy = document.createElement("div");
      copy.className = "result-copy";
      copy.innerHTML = `<strong>${item.title}</strong><span>${item.source}</span><em>${item.metric} · ${item.note}</em>`;
      card.append(image, copy);
      grid.append(card);
    });
  }

  try {
    const response = await fetch("../assets/brain-ai/visual-manifest.json");
    if (!response.ok) throw new Error("manifest unavailable");
    const items = await response.json();
    render(items, "all");
    filters.forEach((button) => {
      button.addEventListener("click", () => {
        filters.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
        render(items, button.dataset.filter);
      });
    });
  } catch (error) {
    grid.innerHTML = "<p>Evidence assets are unavailable in this preview.</p>";
  }
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
