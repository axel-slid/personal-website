(() => {
  const tabs = [...document.querySelectorAll("[data-core]")];
  if (!tabs.length) return;
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute("aria-controls")),
  );
  const videos = panels.map((panel) => panel.querySelector("video"));
  function select(index) {
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
      if (i !== index) videos[i].pause();
    });
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
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) pauseAll();
    });
    observer.observe(document.getElementById("workspace"));
  }
  select(0);
  document.querySelector(".core-tabs").hidden = false;
})();
