
(function(){
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  if(stored){ root.setAttribute("data-theme", stored); }

  const btn = document.getElementById("themeToggle");
  if(btn){
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      btn.setAttribute("aria-label", `Switch to ${current} mode`);
      btn.textContent = next === "dark" ? "Light mode" : "Dark mode";
    });
    const current = root.getAttribute("data-theme") || "light";
    btn.textContent = current === "dark" ? "Light mode" : "Dark mode";
  }

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

  let lastKey = null;
  window.addEventListener("keydown", (e) => {
    if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if(e.key.toLowerCase() === "g"){ lastKey = "g"; return; }
    if(lastKey === "g"){
      if(e.key.toLowerCase() === "t"){ window.scrollTo({top:0, behavior:"smooth"}); }
      if(e.key.toLowerCase() === "b"){ window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"}); }
      lastKey = null;
    }
  });
})();
