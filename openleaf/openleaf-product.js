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
  // Transform decorative leaves only; all page content remains in normal flow.
  const leaves = [...document.querySelectorAll(".foliage")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 640px)");
  let frame = 0;
  let positions = [];

  function measure() {
    positions = leaves.map((leaf) => {
      if (!leaf.offsetParent) return 0;
      // offsetTop is unaffected by the decorative scroll transform.
      return (
        leaf.offsetTop +
        leaf.offsetParent.getBoundingClientRect().top +
        window.scrollY +
        leaf.offsetHeight / 2
      );
    });
    schedule();
  }

  function render() {
    frame = 0;
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    leaves.forEach((leaf, index) => {
      const distance = Math.max(
        -900,
        Math.min(900, viewportCenter - positions[index]),
      );
      const movement =
        distance *
        Number(leaf.dataset.depth) *
        (compactScreen.matches ? 0.35 : 1);
      leaf.style.setProperty("--leaf-y", `${movement.toFixed(2)}px`);
      leaf.style.setProperty("--leaf-turn", `${(movement / 35).toFixed(2)}deg`);
    });
  }

  function schedule() {
    if (!reducedMotion.matches && !frame)
      frame = window.requestAnimationFrame(render);
  }

  function updateMotion() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener("scroll", schedule);
    if (reducedMotion.matches) {
      leaves.forEach((leaf) => {
        leaf.style.removeProperty("--leaf-y");
        leaf.style.removeProperty("--leaf-turn");
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
