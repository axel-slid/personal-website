(() => {
  const desk = document.getElementById("researchDesk");
  if (!desk) return;

  const toolbar = document.querySelector(".demo-toolbar");
  const hint = document.getElementById("demoInstructions");
  const status = document.getElementById("demoStatus");
  const empty = desk.querySelector(".demo-empty");
  const compact = window.matchMedia("(max-width: 760px)");
  const launchers = [...document.querySelectorAll("[data-open]")];
  const initial = ["papers", "slides", "python"];
  const layouts = {
    papers: { width: 0.66, x: 0.06, y: 0.06 },
    slides: { width: 0.4, x: 0.97, y: 0.1 },
    python: { width: 0.47, x: 0.91, y: 0.96 },
  };
  let layer = 0;
  let front = null;
  let drag = null;
  const entries = [...desk.querySelectorAll(".demo-window")].map(
    (node, index) => ({
      node,
      id: node.dataset.demo,
      handle: node.querySelector(".demo-drag"),
      video: node.querySelector("video"),
      play: node.querySelector(".demo-play"),
      expand: node.querySelector("[data-expand]"),
      launcher: launchers.find(
        (button) => button.dataset.open === node.dataset.demo,
      ),
      layout: layouts[node.dataset.demo] || {
        width: 0.6,
        x: 0.18 + index * 0.07,
        y: 0.12 + index * 0.08,
      },
      x: 0,
      y: 0,
      expanded: false,
      saved: null,
    }),
  );
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  function announce(message) {
    status.textContent = message;
  }

  function updateEmpty() {
    empty.hidden = entries.some((entry) => !entry.node.hidden);
  }

  function bringFront(entry) {
    front = entry;
    entries.forEach((item) =>
      item.node.classList.toggle("is-front", item === entry),
    );
    entry.node.style.zIndex = String(++layer);
  }

  function place(entry, reset = false) {
    if (entry.node.hidden || compact.matches) return;
    const width = entry.expanded
      ? Math.min(desk.clientWidth - 24, (desk.clientHeight - 116) * 1.6)
      : Math.max(280, desk.clientWidth * entry.layout.width);
    entry.node.style.width = `${Math.round(width)}px`;
    const maxX = Math.max(0, desk.clientWidth - entry.node.offsetWidth);
    const maxY = Math.max(0, desk.clientHeight - entry.node.offsetHeight);
    if (entry.expanded) {
      entry.x = maxX / 2;
      entry.y = maxY / 2;
    } else if (reset) {
      entry.x = maxX * entry.layout.x;
      entry.y = maxY * entry.layout.y;
    }
    entry.x = Math.max(0, Math.min(maxX, entry.x));
    entry.y = Math.max(0, Math.min(maxY, entry.y));
    entry.node.style.left = `${Math.round(entry.x)}px`;
    entry.node.style.top = `${Math.round(entry.y)}px`;
  }

  function stopDrag() {
    if (!drag) return;
    const { entry, pointerId } = drag;
    drag = null;
    entry.node.classList.remove("is-dragging");
    if (entry.handle.hasPointerCapture(pointerId))
      entry.handle.releasePointerCapture(pointerId);
  }

  function closeEntry(entry, restoreFocus = false) {
    if (drag?.entry === entry) stopDrag();
    entry.video.pause();
    entry.node.hidden = true;
    entry.launcher.setAttribute("aria-expanded", "false");
    if (front === entry) {
      const remaining = entries.filter((item) => !item.node.hidden);
      const next = remaining.sort(
        (a, b) => Number(b.node.style.zIndex) - Number(a.node.style.zIndex),
      )[0];
      front = null;
      if (next) bringFront(next);
    }
    updateEmpty();
    if (restoreFocus) entry.launcher.focus({ preventScroll: true });
  }

  function openEntry(entry, focus = true) {
    if (compact.matches)
      entries.forEach((item) => {
        if (item !== entry) closeEntry(item);
      });
    const wasHidden = entry.node.hidden;
    entry.node.hidden = false;
    entry.launcher.setAttribute("aria-expanded", "true");
    place(entry, wasHidden);
    bringFront(entry);
    updateEmpty();
    if (focus) {
      (compact.matches && !entry.play.hidden ? entry.play : entry.handle).focus(
        {
          preventScroll: true,
        },
      );
      announce(
        `${entry.handle.textContent.trim()} opened. ${compact.matches ? "Play the recording to explore." : "Drag its title bar, or use arrow keys to move it."}`,
      );
    }
  }

  function expandEntry(entry) {
    if (compact.matches) return;
    stopDrag();
    if (!entry.expanded) entry.saved = { x: entry.x, y: entry.y };
    else if (entry.saved) Object.assign(entry, entry.saved);
    entry.expanded = !entry.expanded;
    entry.expand.setAttribute(
      "aria-label",
      `${entry.expanded ? "Restore" : "Expand"} ${entry.id} window`,
    );
    entry.expand.title = entry.expanded ? "Restore window" : "Expand window";
    bringFront(entry);
    place(entry);
  }

  function reset() {
    stopDrag();
    entries.forEach((entry) => {
      closeEntry(entry);
      entry.expanded = false;
      entry.saved = null;
      entry.expand.setAttribute("aria-label", `Expand ${entry.id} window`);
      entry.expand.title = "Expand window";
    });
    layer = 0;
    (compact.matches ? ["papers"] : initial).forEach((id) =>
      openEntry(byId.get(id), false),
    );
  }

  entries.forEach((entry) => {
    entry.node.hidden = true;
    entry.handle.hidden = false;
    entry.node.querySelector(".demo-window-actions").hidden = false;
    entry.play.hidden = false;
    entry.video.controls = false;
    entry.launcher.addEventListener("click", () => openEntry(entry));
    entry.node
      .querySelector("[data-close]")
      .addEventListener("click", () => closeEntry(entry, true));
    entry.expand.addEventListener("click", () => expandEntry(entry));
    entry.node.addEventListener("pointerdown", () => bringFront(entry));
    entry.node.addEventListener("focusin", () => bringFront(entry));
    entry.play.addEventListener("click", async () => {
      bringFront(entry);
      entry.video.controls = true;
      try {
        await entry.video.play();
        if (entry.node.hidden) entry.video.pause();
        entry.play.hidden = true;
      } catch {
        if (entry.node.hidden) return;
        announce(
          "The recording could not start. Use its video controls to try again.",
        );
        entry.play.hidden = false;
      }
    });
    entry.video.addEventListener("play", () => {
      entries.forEach((item) => {
        if (item !== entry) item.video.pause();
      });
      entry.play.hidden = true;
    });
    entry.video.addEventListener("ended", () => {
      entry.play.hidden = false;
    });
    entry.handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || compact.matches || entry.expanded) return;
      stopDrag();
      event.preventDefault();
      entry.handle.focus({ preventScroll: true });
      drag = {
        entry,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: entry.x,
        y: entry.y,
      };
      entry.handle.setPointerCapture(event.pointerId);
      entry.node.classList.add("is-dragging");
    });
    entry.handle.addEventListener("pointermove", (event) => {
      if (drag?.entry !== entry || drag.pointerId !== event.pointerId) return;
      entry.x = drag.x + event.clientX - drag.startX;
      entry.y = drag.y + event.clientY - drag.startY;
      place(entry);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      entry.handle.addEventListener(type, () => {
        if (drag?.entry === entry) stopDrag();
      });
    });
    entry.handle.addEventListener("keydown", (event) => {
      if (compact.matches || entry.expanded) return;
      const step = event.shiftKey ? 40 : 16;
      const moves = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      entry.x += move[0];
      entry.y += move[1];
      place(entry);
    });
    entry.node.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (entry.expanded) expandEntry(entry);
      else closeEntry(entry, true);
    });
  });

  function reflow() {
    stopDrag();
    hint.textContent = compact.matches
      ? "Choose a tool, then play its demo."
      : "Open a tool. Drag the windows. Make room for your ideas.";
    if (compact.matches) {
      const keep = front;
      entries.forEach((entry) => {
        if (entry !== keep) closeEntry(entry);
      });
    }
    entries.forEach((entry) => place(entry));
  }

  document.getElementById("resetDemo").addEventListener("click", () => {
    reset();
    announce("Workspace reset.");
  });
  window.addEventListener("resize", reflow, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) entries.forEach((entry) => entry.video.pause());
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([item]) => {
      if (!item.isIntersecting) entries.forEach((entry) => entry.video.pause());
    });
    observer.observe(desk);
  }
  desk.classList.add("is-interactive");
  toolbar.hidden = false;
  hint.hidden = false;
  reset();
  reflow();
})();
