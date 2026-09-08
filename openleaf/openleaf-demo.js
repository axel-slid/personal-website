(() => {
  const tabs = [...document.querySelectorAll("[data-core]")];
  if (!tabs.length) return;
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute("aria-controls")),
  );
  const videos = panels.map((panel) => panel.querySelector("video"));
  let selected = 0;
  let inView = !("IntersectionObserver" in window);
  function playSelected() {
    if (document.hidden) return;
    const video = videos[selected];
    video.muted = true;
    const playing = video.play();
    playing
      ?.then(() => {
        if (video !== videos[selected] || document.hidden || !inView)
          video.pause();
      })
      .catch(() => {
        // A browser can block playback; selecting a demo again retries it.
      });
  }
  function select(index, play = true) {
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
      if (i !== index) videos[i].pause();
    });
    if (play) {
      videos[index].currentTime = 0;
      playSelected();
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("keydown", (event) => {
      const targets = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const target = targets[event.key];
      select(target);
      tabs[target].focus();
    });
  });
  function pauseAll() {
    videos.forEach((video) => video.pause());
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAll();
    else if (inView) playSelected();
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) playSelected();
      else pauseAll();
    });
    observer.observe(document.getElementById("workspace"));
  }
  select(0, inView);
  document.querySelector(".core-tabs").hidden = false;
})();
