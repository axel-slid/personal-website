(function () {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-email]");
    if (!link) return;

    event.preventDefault();
    const user = link.getAttribute("data-email-user");
    const domain = link.getAttribute("data-email-domain");

    if (user && domain) {
      window.location.href = "mailto:" + user + "@" + domain;
    }
  });

  const revealItems = document.querySelectorAll(".reveal");
  document.body.classList.add("motion-ready");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      item.classList.add("is-visible");
    } else {
      observer.observe(item);
    }
  });
})();

(async function () {
  const grid = document.querySelector("[data-visual-grid]");
  if (!grid) return;

  const filters = [...document.querySelectorAll("[data-filter]")];

  function render(items, filter) {
    const visible = filter === "all" ? items : items.filter((item) => item.category === filter);
    grid.innerHTML = "";
    visible.forEach((item) => {
      const card = document.createElement("article");
      card.className = "visual-card";
      card.dataset.category = item.category;

      const image = document.createElement("img");
      image.src = item.src;
      image.alt = `${item.title}: ${item.metric}`;
      image.loading = "lazy";
      image.decoding = "async";

      const copy = document.createElement("div");
      copy.className = "visual-card-copy";
      copy.innerHTML = `<strong>${item.title}</strong><span>${item.source}</span><em>${item.metric} · ${item.note}</em>`;
      card.append(image, copy);
      grid.append(card);
    });
  }

  try {
    const response = await fetch("assets/brain-ai/visual-manifest.json");
    if (!response.ok) throw new Error("visual manifest unavailable");
    const items = await response.json();
    render(items, "all");
    filters.forEach((button) => {
      button.addEventListener("click", () => {
        filters.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        render(items, button.dataset.filter);
      });
    });
  } catch (error) {
    grid.innerHTML = '<p class="visual-load-error">The evidence wall is loading locally. Open the site through its web server to view the animated run cards.</p>';
  }
})();
