(() => {
  "use strict";

  const tabs = Array.from(document.querySelectorAll(".product-tabs [role='tab']"));
  const image = document.querySelector("#productImage");
  const caption = document.querySelector("#productCaption");
  const year = document.querySelector("#year");

  if (year) year.textContent = String(new Date().getFullYear());

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      selectTab(next);
    });
  });

  function selectTab(index) {
    const tab = tabs[index];
    if (!tab || !image || !caption) return;
    tabs.forEach((item, itemIndex) => {
      item.setAttribute("aria-selected", String(itemIndex === index));
      item.tabIndex = itemIndex === index ? 0 : -1;
    });
    image.classList.add("is-changing");
    const preload = new Image();
    preload.onload = () => {
      image.src = tab.dataset.image;
      image.alt = tab.dataset.alt;
      caption.textContent = tab.dataset.caption;
      requestAnimationFrame(() => image.classList.remove("is-changing"));
    };
    preload.src = tab.dataset.image;
  }
})();
