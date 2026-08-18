(() => {
  const film = document.getElementById("openleaf-film");
  const command = document.getElementById("installCommand");
  const copyButton = document.getElementById("copyInstall");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const syncPlayback = () => {
    if (!film) return;
    if (reducedMotion.matches || document.hidden) {
      film.pause();
      return;
    }
    film.play().catch(() => {});
  };

  copyButton?.addEventListener("click", async () => {
    const value = command.textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      selection.removeAllRanges();
    }

    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1400);
  });

  reducedMotion.addEventListener?.("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncPlayback();
})();
