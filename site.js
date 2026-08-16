(() => {
  "use strict";

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-email]");
    if (!link) return;
    event.preventDefault();
    const user = link.getAttribute("data-email-user");
    const domain = link.getAttribute("data-email-domain");
    if (user && domain) window.location.href = `mailto:${user}@${domain}`;
  });

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const colorLab = document.querySelector("[data-color-lab]");
  const colorToggle = document.querySelector("[data-color-toggle]");
  const colorPanel = document.querySelector("[data-color-panel]");
  const colorChoices = [...document.querySelectorAll("[data-color-choice]")];
  const validSchemes = new Set(["original", "sage", "midnight", "charcoal"]);
  const themeColors = {
    original: "#ffffff",
    sage: "#f7faf7",
    midnight: "#0b1220",
    charcoal: "#151617"
  };

  const getScheme = () => {
    const current = document.documentElement.dataset.theme || "original";
    return validSchemes.has(current) ? current : "original";
  };

  const applyScheme = (scheme) => {
    if (!validSchemes.has(scheme)) return;
    if (scheme === "original") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = scheme;

    colorChoices.forEach((choice) => {
      choice.setAttribute("aria-pressed", String(choice.dataset.colorChoice === scheme));
    });

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", themeColors[scheme]);

    try {
      localStorage.setItem("alex-color-scheme", scheme);
    } catch (_) {}
  };

  const closeColorLab = () => {
    if (!colorPanel || !colorToggle) return;
    colorPanel.hidden = true;
    colorToggle.setAttribute("aria-expanded", "false");
  };

  if (colorLab && colorToggle && colorPanel) {
    applyScheme(getScheme());

    colorToggle.addEventListener("click", () => {
      const willOpen = colorPanel.hidden;
      colorPanel.hidden = !willOpen;
      colorToggle.setAttribute("aria-expanded", String(willOpen));
    });

    colorChoices.forEach((choice) => {
      choice.addEventListener("click", () => applyScheme(choice.dataset.colorChoice));
    });

    document.addEventListener("click", (event) => {
      if (!colorLab.contains(event.target)) closeColorLab();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeColorLab();
        colorToggle.focus();
      }
    });
  }
})();
