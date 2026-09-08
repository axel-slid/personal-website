(() => {
  const command = document.getElementById("installCommand");
  const button = document.getElementById("copyInstall");
  const status = document.getElementById("copyStatus");
  button?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        command.textContent.replace(/\s+/g, " ").trim(),
      );
      button.dataset.copied = "true";
      button.setAttribute("aria-label", "Install command copied");
      status.textContent = "Install command copied to clipboard.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(command);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Command selected. Copy it with your keyboard.";
      button.setAttribute(
        "aria-label",
        "Install command selected; copy with your keyboard",
      );
    }
    window.setTimeout(() => {
      delete button.dataset.copied;
      button.setAttribute("aria-label", "Copy the Openleaf install command");
    }, 1800);
  });
  const workspaceTabs = [
    ...document.querySelectorAll(".workspace-tabs [role='tab']"),
  ];
  const workspacePanel = document.getElementById("workspacePanel");
  const workspaceCaption = document.getElementById("workspaceCaption");
  const workspaceImage = document.getElementById("workspaceImage");
  const views = {
    overview: [
      "One project. Source, paper, and tools together.",
      "Openleaf workspace with project files, LaTeX source, PDF preview, and a terminal dock.",
    ],
    source: [
      "A closer look at your manuscript’s LaTeX source.",
      "Zoomed view of the LaTeX source editor and syntax highlighting in Openleaf.",
    ],
    pdf: [
      "Your paper, right beside the source.",
      "Zoomed view of the rendered paper in Openleaf’s PDF preview.",
    ],
    agents: [
      "Shell, Codex, and Claude, within reach of your manuscript.",
      "Zoomed view of Openleaf’s terminal dock with Shell, Codex, and Claude launch controls.",
    ],
  };
  function selectWorkspaceTab(tab) {
    const view = tab.dataset.view;
    workspaceTabs.forEach((item) => {
      item.setAttribute("aria-selected", String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    });
    workspacePanel.dataset.view = view;
    workspacePanel.setAttribute("aria-labelledby", tab.id);
    workspaceCaption.textContent = views[view][0];
    workspaceImage.alt = views[view][1];
  }
  workspaceTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectWorkspaceTab(tab));
    tab.addEventListener("keydown", (event) => {
      let target;
      if (event.key === "ArrowRight")
        target = (index + 1) % workspaceTabs.length;
      else if (event.key === "ArrowLeft")
        target = (index - 1 + workspaceTabs.length) % workspaceTabs.length;
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = workspaceTabs.length - 1;
      else return;
      event.preventDefault();
      workspaceTabs[target].focus();
      selectWorkspaceTab(workspaceTabs[target]);
    });
  });
  if (workspaceTabs.length)
    document.querySelector(".workspace-tabs").hidden = false;

  // Transform decorative leaves only; all page content remains in normal flow.
  const leaves = [...document.querySelectorAll(".foliage")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 640px)");
  let frame = 0;
  let positions = [];
  let currentScroll = window.scrollY;
  let previousTime = 0;

  function measure() {
    positions = leaves.map((leaf) => {
      if (!leaf.offsetParent) return null;
      return (
        leaf.offsetTop +
        leaf.offsetParent.getBoundingClientRect().top +
        window.scrollY +
        leaf.offsetHeight / 2
      );
    });
    schedule();
  }

  function render(time) {
    frame = 0;
    // Ease for a fraction of a second after a wheel/touch input, then stop.
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    currentScroll +=
      (window.scrollY - currentScroll) * (1 - Math.exp(-elapsed / 85));
    const moving = Math.abs(window.scrollY - currentScroll) > 0.25;
    if (!moving) currentScroll = window.scrollY;
    const viewportCenter = currentScroll + window.innerHeight / 2;
    const intensity = compactScreen.matches ? 0.5 : 1;
    leaves.forEach((leaf, index) => {
      if (positions[index] === null) return;
      const distance = Math.max(
        -1000,
        Math.min(1000, viewportCenter - positions[index]),
      );
      const progress = distance / 1000;
      const side = Number(leaf.dataset.side);
      const depth = Number(leaf.dataset.depth);
      const movement = distance * depth * intensity;
      // Canopy parts sideways; each deeper layer passes at its own speed.
      const spread = side * progress * 115 * intensity;
      const turn = side * progress * 22 * intensity;
      leaf.style.setProperty("--leaf-x", `${spread.toFixed(2)}px`);
      leaf.style.setProperty("--leaf-y", `${movement.toFixed(2)}px`);
      leaf.style.setProperty("--leaf-turn", `${turn.toFixed(2)}deg`);
      leaf.style.setProperty(
        "--leaf-scale",
        (1 + (progress + 1) * 0.06 * intensity).toFixed(3),
      );
    });
    if (moving) schedule();
    else previousTime = 0;
  }

  function schedule() {
    if (!reducedMotion.matches && !frame)
      frame = window.requestAnimationFrame(render);
  }

  function updateMotion() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    currentScroll = window.scrollY;
    window.removeEventListener("scroll", schedule);
    if (reducedMotion.matches) {
      leaves.forEach((leaf) => {
        ["--leaf-x", "--leaf-y", "--leaf-turn", "--leaf-scale"].forEach(
          (property) => leaf.style.removeProperty(property),
        );
      });
    } else {
      window.addEventListener("scroll", schedule, { passive: true });
      measure();
    }
  }

  if (leaves.length) {
    reducedMotion.addEventListener("change", updateMotion);
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure, { once: true });
    document.fonts?.ready.then(measure);
    updateMotion();
  }
})();
