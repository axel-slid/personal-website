const body = document.body;
const menuToggle = document.querySelector("#menu-toggle");
const siteMenu = document.querySelector("#site-menu");

function setMenu(open) {
  body.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  menuToggle?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  siteMenu?.setAttribute("aria-hidden", String(!open));
  if (siteMenu) siteMenu.inert = !open;
}

menuToggle?.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
siteMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function animateCounter(element) {
  const target = Number(element.dataset.count || 0);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = new Intl.NumberFormat("en-US").format(target);
    return;
  }
  const duration = 1500;
  const start = performance.now();
  const formatter = new Intl.NumberFormat("en-US");

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll("[data-count]").forEach((counter) => counterObserver.observe(counter));
