
(function(){
  const root = document.documentElement;

  // initial theme
  const stored = localStorage.getItem("theme");
  if(stored){ root.setAttribute("data-theme", stored); }

  // theme link handlers
  function setTheme(t){
    root.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    // update nav state if present
    document.querySelectorAll('[data-set-theme]').forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('data-set-theme') === t ? 'true' : 'false');
    });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("[data-set-theme]");
    if(!a) return;
    e.preventDefault();
    setTheme(a.getAttribute("data-set-theme"));
  });

  // set current markers on load
  const current = root.getAttribute("data-theme") || "light";
  document.querySelectorAll('[data-set-theme]').forEach(a => {
    a.setAttribute('aria-current', a.getAttribute('data-set-theme') === current ? 'true' : 'false');
  });

  // reading progress
  const bar = document.getElementById("progress");
  function onScroll(){
    if(!bar) return;
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const height = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.max(0, (scrolled/height)*100));
    bar.style.width = pct + "%";
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();
})();
