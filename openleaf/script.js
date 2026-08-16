/* Openleaf interactions adapted from Pulkit's MIT-licensed Aurum template. */
(() => {
  const installCommand = "curl -fsSL https://alex-dils.com/openleaf/install.sh | bash";
  const nav = document.getElementById("nav");
  const burger = document.querySelector(".nav-burger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const stage = document.getElementById("workspace");
  const net = document.getElementById("net");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setNavState = () => nav?.classList.toggle("scrolled", window.scrollY > 40);
  setNavState();
  window.addEventListener("scroll", setNavState, { passive: true });

  burger?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(isOpen));
    mobileMenu?.setAttribute("aria-hidden", String(!isOpen));
  });

  mobileMenu?.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => {
      nav.classList.remove("menu-open");
      burger?.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("in"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
      observer.observe(item);
    });
  }

  const copyInstaller = async (button) => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(installCommand);
      button.textContent = "Copied";
    } catch (error) {
      const command = document.getElementById("install-command");
      if (command) {
        const range = document.createRange();
        range.selectNodeContents(command);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      button.textContent = "Selected";
    }
    window.setTimeout(() => { button.textContent = original; }, 1500);
  };

  document.querySelectorAll(".copy-trigger").forEach((button) => {
    button.addEventListener("click", () => copyInstaller(button));
  });

  const viewBoxWidth = 1000;
  const viewBoxHeight = 562;

  const drawNetwork = () => {
    if (!stage || !net || window.innerWidth <= 760) return;
    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width) return;

    const centerOf = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: ((rect.left + rect.width / 2 - stageRect.left) / stageRect.width) * viewBoxWidth,
        y: ((rect.top + rect.height / 2 - stageRect.top) / stageRect.height) * viewBoxHeight,
      };
    };

    const central = stage.querySelector(".central");
    const center = centerOf(central);
    const defs = net.querySelector("defs");
    net.replaceChildren(defs);

    stage.querySelectorAll(".satellite").forEach((satellite, index) => {
      const point = centerOf(satellite);
      const midpointX = (point.x + center.x) / 2;
      const midpointY = (point.y + center.y) / 2;
      const dx = center.y - point.y;
      const dy = point.x - center.x;
      const length = Math.hypot(dx, dy) || 1;
      const bow = 46 * (index % 2 ? 1 : -1);
      const controlX = midpointX + (dx / length) * bow;
      const controlY = midpointY + (dy / length) * bow;
      const pathData = `M${point.x.toFixed(1)},${point.y.toFixed(1)} Q${controlX.toFixed(1)},${controlY.toFixed(1)} ${center.x.toFixed(1)},${center.y.toFixed(1)}`;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "node-line");
      path.setAttribute("d", pathData);
      path.setAttribute("stroke", "url(#lineGrad)");
      if (!reducedMotion) path.style.animation = `pulsing-branch ${2.6 + index * 0.4}s ease-in-out ${index * 0.25}s infinite`;
      net.appendChild(path);

      const flow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      flow.setAttribute("class", "node-flow");
      flow.setAttribute("d", pathData);
      flow.style.animationDelay = `${index * 0.5}s`;
      net.appendChild(flow);

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", point.x.toFixed(1));
      dot.setAttribute("cy", point.y.toFixed(1));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", "#d5ead9");
      net.appendChild(dot);
    });
  };

  drawNetwork();
  window.addEventListener("resize", drawNetwork, { passive: true });
  window.setTimeout(drawNetwork, 250);
  document.fonts?.ready.then(drawNetwork);

  if (!reducedMotion && stage) {
    let frame = null;
    stage.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        stage.querySelectorAll(".satellite").forEach((satellite, index) => {
          const depth = 14 + (index % 3) * 8;
          satellite.style.transform = `translate(${(-x * depth).toFixed(1)}px, ${(-y * depth).toFixed(1)}px)`;
        });

        const central = stage.querySelector(".central");
        central.style.transform = `translate(calc(-50% + ${(x * 10).toFixed(1)}px), calc(-50% + ${(y * 10).toFixed(1)}px))`;
        drawNetwork();
        frame = null;
      });
    });

    stage.addEventListener("pointerleave", () => {
      stage.querySelectorAll(".satellite").forEach((satellite) => { satellite.style.transform = ""; });
      const central = stage.querySelector(".central");
      central.style.transform = "translate(-50%, -50%)";
      drawNetwork();
    });

    window.addEventListener("pointermove", (event) => {
      document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
      document.documentElement.style.setProperty("--my", `${event.clientY}px`);
    }, { passive: true });
  }
})();
