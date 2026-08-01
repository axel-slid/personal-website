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
