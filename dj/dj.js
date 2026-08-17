(function () {
  const form = document.querySelector("[data-booking-form]");
  const dateInput = document.querySelector("#booking-date");
  const status = document.querySelector("[data-form-status]");

  if (dateInput) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    dateInput.min = localDate.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("sent") === "1" && status) {
    status.hidden = false;
    status.focus({ preventScroll: true });
    window.history.replaceState({}, "", `${window.location.pathname}#booking`);
  }

  form?.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    button.textContent = "Sending…";
  });

  const carousel = document.querySelector("[data-photo-carousel]");
  const track = carousel?.querySelector("[data-carousel-track]");
  const slides = carousel ? [...carousel.querySelectorAll("[data-carousel-slide]")] : [];
  const previous = carousel?.querySelector("[data-carousel-prev]");
  const next = carousel?.querySelector("[data-carousel-next]");
  const dotsWrap = carousel?.querySelector("[data-carousel-dots]");
  const current = carousel?.querySelector("[data-carousel-current]");

  if (carousel && track && slides.length && dotsWrap) {
    let activeIndex = 0;
    let touchStartX = null;

    const dots = slides.map((slide, index) => {
      const dot = document.createElement("button");
      const caption = slide.querySelector("figcaption")?.textContent?.trim();
      dot.className = "carousel-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Show photo ${index + 1}${caption ? `: ${caption}` : ""}`);
      dot.setAttribute("aria-current", String(index === 0));
      dot.addEventListener("click", () => showSlide(index));
      dotsWrap.appendChild(dot);
      return dot;
    });

    const showSlide = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      track.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;
      slides.forEach((slide, slideIndex) => {
        slide.setAttribute("aria-hidden", String(slideIndex !== activeIndex));
      });
      dots.forEach((dot, dotIndex) => {
        dot.setAttribute("aria-current", String(dotIndex === activeIndex));
      });
      if (current) current.textContent = String(activeIndex + 1);
    };

    previous?.addEventListener("click", () => showSlide(activeIndex - 1));
    next?.addEventListener("click", () => showSlide(activeIndex + 1));

    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(activeIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        showSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        showSlide(slides.length - 1);
      }
    });

    carousel.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });

    carousel.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) < 45) return;
      showSlide(activeIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });

    showSlide(0);
  }
})();
