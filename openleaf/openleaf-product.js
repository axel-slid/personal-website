(() => {
  const command = document.getElementById("installCommand");
  const button = document.getElementById("copyInstall");
  const status = document.getElementById("copyStatus");
  button?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(command.textContent.trim());
      button.textContent = "Copied";
      status.textContent = "Install command copied to clipboard.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(command);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Command selected. Copy it with your keyboard.";
      button.textContent = "Selected";
    }
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1800);
  });
})();
