(() => {
  const toc = document.querySelector(".toc");
  if (!toc) return;
  const entries = [...toc.querySelectorAll('a[href^="#"]')]
    .map((link) => ({
      link,
      section: document.getElementById(link.hash.slice(1)),
      top: 0,
    }))
    .filter((entry) => entry.section);
  if (!entries.length) return;
  let queued = false;
  let current = null;

  function update() {
    queued = false;
    const readingLine =
      window.scrollY + Math.min(160, Math.max(72, window.innerHeight * 0.2));
    let selected = entries[0];
    for (const entry of entries) {
      if (entry.top > readingLine) break;
      selected = entry;
    }
    if (
      window.scrollY > 0 &&
      window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 3
    ) {
      selected = entries[entries.length - 1];
    }
    if (selected === current) return;
    current = selected;
    entries.forEach((entry) => {
      if (entry === selected)
        entry.link.setAttribute("aria-current", "location");
      else entry.link.removeAttribute("aria-current");
    });
    // Keep the active item visible inside a short sidebar without moving the page.
    if (
      window.matchMedia("(min-width: 821px)").matches &&
      toc.scrollHeight > toc.clientHeight
    ) {
      const item = selected.link.getBoundingClientRect();
      const bounds = toc.getBoundingClientRect();
      if (item.top < bounds.top + 8) toc.scrollTop -= bounds.top + 8 - item.top;
      else if (item.bottom > bounds.bottom - 8)
        toc.scrollTop += item.bottom - bounds.bottom + 8;
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }
  function measure() {
    entries.forEach((entry) => {
      entry.top = entry.section.getBoundingClientRect().top + window.scrollY;
    });
    entries.sort((a, b) => a.top - b.top);
    schedule();
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("pageshow", measure);
  window.addEventListener("load", measure, { once: true });
  document.fonts?.ready.then(measure);
  if ("ResizeObserver" in window)
    new ResizeObserver(measure).observe(
      document.querySelector(".docs-shell article"),
    );
  measure();
})();
