(() => {
  const film = document.getElementById("bscodeDigitalTwin");
  const command = document.getElementById("installCommand");
  const copyButton = document.getElementById("copyInstall");
  const copyLabel = document.getElementById("copyLabel");
  const filmCaption = document.querySelector(".film-caption");
  const sceneEyebrow = document.getElementById("sceneEyebrow");
  const sceneCaption = document.getElementById("sceneCaption");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const playbackRate = 0.65;
  const scenes = [
    { startsAt: 0, eyebrow: "The workspace", caption: "Four coding agents run side by side while their terminals stay visible." },
    { startsAt: 6, eyebrow: "Live progress", caption: "A task checklist updates as each agent finishes a step." },
    { startsAt: 9, eyebrow: "Cinematic mode", caption: "One instruction switches the team into a focused cinematic workspace." },
    { startsAt: 15, eyebrow: "Pixel tower", caption: "Agent activity becomes a live pixel-art map of the workspace." },
    { startsAt: 21, eyebrow: "Finished outputs", caption: "Completed files and previews collect beside the agents that created them." }
  ];

  let activeScene = -1;

  const syncCaption = () => {
    if (!film || !sceneEyebrow || !sceneCaption) return;
    const currentScene = scenes.findLastIndex((scene) => film.currentTime >= scene.startsAt);
    const sceneIndex = Math.max(0, currentScene);
    if (sceneIndex === activeScene) return;
    activeScene = sceneIndex;
    sceneEyebrow.textContent = scenes[sceneIndex].eyebrow;
    sceneCaption.textContent = scenes[sceneIndex].caption;
    document.body.classList.toggle("is-cinematic", sceneIndex === 2);

    if (filmCaption) {
      filmCaption.classList.remove("is-changing");
      void filmCaption.offsetWidth;
      filmCaption.classList.add("is-changing");
    }
  };

  const syncPlayback = () => {
    if (!film) return;
    film.defaultPlaybackRate = playbackRate;
    film.playbackRate = playbackRate;
    if (reducedMotion.matches || document.hidden) {
      film.pause();
      return;
    }
    film.play().catch(() => {});
  };

  copyButton?.addEventListener("click", async () => {
    const value = command.textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      selection.removeAllRanges();
    }

    copyLabel.textContent = "Copied";
    window.setTimeout(() => {
      copyLabel.textContent = "Copy";
    }, 1400);
  });

  film?.addEventListener("loadedmetadata", syncPlayback);
  film?.addEventListener("timeupdate", syncCaption);
  film?.addEventListener("seeked", syncCaption);
  reducedMotion.addEventListener?.("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncCaption();
  syncPlayback();
})();
