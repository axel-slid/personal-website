/* Alex Dils — site script
   Theme switcher (persisted) + reading-progress bar.
*/
(function () {
  // ---------- theme ----------
  const THEMES = ["light", "dark"];
  const root = document.documentElement;

  function applyTheme(t) {
    if (!THEMES.includes(t)) t = "light";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("ad-theme", t); } catch (e) {}
    document.querySelectorAll("[data-set-theme]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-theme") === t ? "true" : "false");
    });
  }

  let saved = "light";
  try { saved = localStorage.getItem("ad-theme") || "light"; } catch (e) {}
  applyTheme(saved);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-set-theme]");
    if (!btn) return;
    e.preventDefault();
    applyTheme(btn.getAttribute("data-set-theme"));
  });

  // ---------- reading progress ----------
  const bar = document.getElementById("progress");
  if (bar) {
    function tick() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    tick();
  }

  // ---------- email reveal ----------
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-email]");
    if (!a) return;
    e.preventDefault();
    const u = a.getAttribute("data-email-user");
    const d = a.getAttribute("data-email-domain");
    if (u && d) {
      window.location.href = "mailto:" + u + "@" + d;
    }
  });
})();
