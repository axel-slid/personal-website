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
})();
