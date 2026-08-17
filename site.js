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

  const researchToolsDialog = document.querySelector("[data-research-tools-dialog]");
  const researchToolsOpeners = [...document.querySelectorAll("[data-research-tools-open]")];
  const researchToolsClose = document.querySelector("[data-research-tools-close]");
  let researchToolsReturnFocus = null;

  const closeResearchTools = () => {
    if (researchToolsDialog?.open) researchToolsDialog.close();
  };

  if (researchToolsDialog) {
    researchToolsOpeners.forEach((opener) => {
      opener.addEventListener("click", () => {
        researchToolsReturnFocus = opener;
        researchToolsDialog.showModal();
        document.body.classList.add("modal-open");
        researchToolsClose?.focus();
      });
    });

    researchToolsClose?.addEventListener("click", closeResearchTools);

    researchToolsDialog.addEventListener("click", (event) => {
      if (event.target === researchToolsDialog) closeResearchTools();
    });

    researchToolsDialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      researchToolsReturnFocus?.focus();
      researchToolsReturnFocus = null;
    });
  }

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  };

  document.querySelectorAll("[data-copy-command]").forEach((button) => {
    button.addEventListener("click", async () => {
      const command = button.closest(".research-install-command")?.querySelector("code")?.textContent?.trim();
      if (!command) return;

      try {
        await copyText(command);
        button.textContent = "Copied";
      } catch (_) {
        button.textContent = "Select";
      }

      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    });
  });
})();
