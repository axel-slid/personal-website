
(function(){
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  if(stored){ root.setAttribute("data-theme", stored); }

  function setTheme(t){
    root.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    document.querySelectorAll('[data-set-theme]').forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('data-set-theme') === t ? 'true' : 'false');
    });
  }

  document.addEventListener("click", (e) => {
    const themeLink = e.target.closest && e.target.closest("[data-set-theme]");
    if(themeLink){
      e.preventDefault();
      setTheme(themeLink.getAttribute("data-set-theme"));
      return;
    }

    const a = e.target.closest && e.target.closest("a[href]");
    if(!a) return;
    if(a.hasAttribute("data-no-transition")) return;

    const href = a.getAttribute("href") || "";
    if(href.startsWith("#")) return;
    if(href.startsWith("transition.html")) return;
    if(href.startsWith("index.html") || href.startsWith("story.html")) return;

    if(href.endsWith(".pdf") || href.endsWith(".png") || href.endsWith(".jpg") || href.endsWith(".jpeg") || href.endsWith(".gif") || href.endsWith(".svg") || href.endsWith(".mov") || href.endsWith(".mp4")) return;

    try{
      const url = new URL(href, window.location.href);
      if(url.origin !== window.location.origin){
        e.preventDefault();
        window.location.href = "transition.html?to=" + encodeURIComponent(url.href);
      }
    }catch(err){}
  });

  const current = root.getAttribute("data-theme") || "light";
  document.querySelectorAll('[data-set-theme]').forEach(a => {
    a.setAttribute('aria-current', a.getAttribute('data-set-theme') === current ? 'true' : 'false');
  });

  const bar = document.getElementById("progress");
  function onScroll(){
    if(!bar) return;
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const height = (h.scrollHeight - h.clientHeight) || 1;
    bar.style.width = (scrolled/height)*100 + "%";
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();
})();
