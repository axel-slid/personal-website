(() => {
  "use strict";

  const video = document.querySelector("#productVideo");
  const toggle = document.querySelector("#videoToggle");
  const year = document.querySelector("#year");

  if (year) year.textContent = String(new Date().getFullYear());

  if (video && toggle) {
    toggle.addEventListener("click", async () => {
      if (video.paused) {
        await video.play();
        toggle.innerHTML = "<span aria-hidden=\"true\">Ⅱ</span>";
        toggle.setAttribute("aria-label", "Pause product tour");
      } else {
        video.pause();
        toggle.innerHTML = "<span aria-hidden=\"true\">▶</span>";
        toggle.setAttribute("aria-label", "Play product tour");
      }
    });

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      video.pause();
      toggle.innerHTML = "<span aria-hidden=\"true\">▶</span>";
      toggle.setAttribute("aria-label", "Play product tour");
    }
  }
})();
