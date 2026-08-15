(() => {
  "use strict";

  const timeline = document.querySelector(".feature-timeline");
  const screens = Array.from(document.querySelectorAll(".timeline-screen"));
  const markers = Array.from(document.querySelectorAll(".timeline-progress li"));
  const count = document.querySelector("#timelineCount");
  const title = document.querySelector("#timelineTitle");
  const description = document.querySelector("#timelineDescription");
  const lockup = document.querySelector("#timelineLockup");
  const screenLabel = document.querySelector("#screenLabel");
  const year = document.querySelector("#year");
  let activeIndex = 0;
  let framePending = false;

  if (year) year.textContent = String(new Date().getFullYear());

  function lockupMarkup(kind, label) {
    if (kind === "rekordbox") {
      return `<span class="rekordbox-mark"><img src="rekordbox-logo.svg" alt="Rekordbox logo"></span><span>${label}</span>`;
    }
    return `<img class="mini-app-icon" src="app-icon.png" alt=""><span>${label}</span>`;
  }

  function activate(index) {
    if (index === activeIndex || !screens[index]) return;
    activeIndex = index;
    screens.forEach((screen, screenIndex) => screen.classList.toggle("active", screenIndex === index));
    markers.forEach((marker, markerIndex) => marker.classList.toggle("active", markerIndex <= index));
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(screens.length).padStart(2, "0")}`;

    const screen = screens[index];
    title.innerHTML = screen.dataset.title;
    description.textContent = screen.dataset.description;
    lockup.innerHTML = lockupMarkup(screen.dataset.kind, screen.dataset.label);
    screenLabel.textContent = screen.dataset.label;
  }

  function updateTimeline() {
    framePending = false;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const scrollable = Math.max(1, rect.height - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
    timeline.style.setProperty("--timeline-progress", `${progress * 100}%`);
    const nextIndex = Math.min(screens.length - 1, Math.floor(progress * screens.length));
    activate(nextIndex);
  }

  function requestUpdate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateTimeline);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();
})();
