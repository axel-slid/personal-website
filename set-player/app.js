(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const audio = $("#audio");
  const deck = $("#dropZone");
  const visualizer = $("#visualizer");
  const canvas = $("#waveform");
  const ctx = canvas.getContext("2d");
  const playButton = $("#playButton");
  const fileInput = $("#fileInput");
  const queueList = $("#queueList");
  const queueCount = $("#queueCount");
  const clearButton = $("#clearButton");
  const trackTitle = $("#trackTitle");
  const trackMeta = $("#trackMeta");
  const currentTime = $("#currentTime");
  const remainingTime = $("#remainingTime");
  const playhead = $("#playhead");
  const statusText = $("#statusText");
  const volumeSlider = $("#volumeSlider");
  const muteButton = $("#muteButton");
  const speedSelect = $("#speedSelect");
  const loopButton = $("#loopButton");
  const shuffleButton = $("#shuffleButton");
  const shortcutsDialog = $("#shortcutsDialog");
  const toast = $("#toast");

  let tracks = [];
  let activeIndex = -1;
  let audioContext;
  let analyser;
  let sourceNode;
  let animationFrame;
  let decodedPeaks = null;
  let toastTimer;

  const storedVolume = Number(localStorage.getItem("setPlayerVolume"));
  if (Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1) {
    audio.volume = storedVolume;
    volumeSlider.value = storedVolume;
  } else {
    audio.volume = 0.85;
  }
  updateVolumeFill();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function cleanTitle(name) {
    return name
      .replace(/\.[^/.]+$/, "")
      .replace(/[_]+/g, " ")
      .replace(/\s*[-–—]\s*/g, " — ")
      .replace(/^\d+[\s._-]+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isAudioFile(file) {
    return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name);
  }

  function addFiles(fileList) {
    const files = Array.from(fileList).filter(isAudioFile);
    if (!files.length) {
      showToast("No supported audio files found");
      return;
    }

    const additions = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      title: cleanTitle(file.name),
      duration: null
    }));
    tracks.push(...additions);
    renderQueue();
    if (activeIndex === -1) loadTrack(0, true);
    showToast(`${files.length} ${files.length === 1 ? "set" : "sets"} added`);
    fileInput.value = "";
  }

  function renderQueue() {
    queueList.replaceChildren();
    tracks.forEach((track, index) => {
      const item = document.createElement("li");
      item.className = `queue-item${index === activeIndex ? " active" : ""}`;
      item.dataset.id = track.id;
      item.innerHTML = `
        <span class="queue-index"><span>${String(index + 1).padStart(2, "0")}</span></span>
        <button class="queue-main" type="button" data-play="${index}" aria-label="Play ${escapeHtml(track.title)}">
          <strong>${escapeHtml(track.title)}</strong>
          <span>${track.duration ? formatTime(track.duration) : formatFileSize(track.file.size)}</span>
        </button>
        <button class="remove-track" type="button" data-remove="${index}" aria-label="Remove ${escapeHtml(track.title)}">×</button>`;
      queueList.appendChild(item);
    });
    queueCount.textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
    clearButton.disabled = tracks.length === 0;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function formatFileSize(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }

  async function loadTrack(index, autoplay = false) {
    if (!tracks[index]) return;
    const wasPlaying = !audio.paused;
    activeIndex = index;
    decodedPeaks = null;
    audio.src = tracks[index].url;
    audio.load();
    trackTitle.textContent = tracks[index].title;
    trackMeta.textContent = `${tracks[index].file.type || "Audio"} / ${formatFileSize(tracks[index].file.size)}`;
    deck.classList.add("has-track");
    playButton.disabled = false;
    playhead.style.left = "0%";
    currentTime.textContent = "00:00";
    remainingTime.textContent = "−00:00";
    visualizer.setAttribute("aria-valuenow", "0");
    renderQueue();
    drawIdleWaveform();
    decodeWaveform(tracks[index].file);
    if (autoplay && wasPlaying) await playAudio();
  }

  async function decodeWaveform(file) {
    if (file.size > 35 * 1024 * 1024) {
      decodedPeaks = null;
      drawIdleWaveform();
      return;
    }
    try {
      const context = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioContext) audioContext = context;
      const buffer = await file.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer.slice(0));
      if (tracks[activeIndex]?.file !== file) return;
      const data = audioBuffer.getChannelData(0);
      const samples = 420;
      const block = Math.floor(data.length / samples);
      decodedPeaks = Array.from({ length: samples }, (_, i) => {
        let peak = 0;
        const start = i * block;
        for (let j = 0; j < block; j += Math.max(1, Math.floor(block / 60))) {
          peak = Math.max(peak, Math.abs(data[start + j] || 0));
        }
        return peak;
      });
      drawIdleWaveform();
    } catch (_) {
      decodedPeaks = null;
      drawIdleWaveform();
    }
  }

  function initAnalyser() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!sourceNode) {
      sourceNode = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
  }

  async function playAudio() {
    if (activeIndex < 0) {
      fileInput.click();
      return;
    }
    try {
      initAnalyser();
      await audio.play();
    } catch (_) {
      showToast("Playback needs another tap");
    }
  }

  function togglePlayback() {
    if (audio.paused) playAudio(); else audio.pause();
  }

  function updatePlaybackUI() {
    const playing = !audio.paused;
    playButton.classList.toggle("is-playing", playing);
    playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    statusText.classList.toggle("playing", playing);
    statusText.lastChild.textContent = playing ? " Playing" : " Paused";
    if (playing) animateWaveform(); else {
      cancelAnimationFrame(animationFrame);
      drawIdleWaveform();
    }
  }

  function updateTime() {
    const duration = audio.duration || 0;
    const progress = duration ? audio.currentTime / duration : 0;
    currentTime.textContent = formatTime(audio.currentTime);
    remainingTime.textContent = `−${formatTime(Math.max(0, duration - audio.currentTime))}`;
    playhead.style.left = `${progress * 100}%`;
    visualizer.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  }

  function seekBy(seconds) {
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
  }

  function seekFromPointer(event) {
    if (!Number.isFinite(audio.duration)) return;
    const rect = visualizer.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }

  function nextTrack() {
    if (!tracks.length) return;
    let next;
    if (shuffleButton.getAttribute("aria-pressed") === "true" && tracks.length > 1) {
      do next = Math.floor(Math.random() * tracks.length); while (next === activeIndex);
    } else {
      next = (activeIndex + 1) % tracks.length;
    }
    const shouldPlay = !audio.paused || audio.ended;
    loadTrack(next).then(() => { if (shouldPlay) playAudio(); });
  }

  function previousTrack() {
    if (!tracks.length) return;
    if (audio.currentTime > 5) {
      audio.currentTime = 0;
      return;
    }
    const previous = (activeIndex - 1 + tracks.length) % tracks.length;
    const shouldPlay = !audio.paused;
    loadTrack(previous).then(() => { if (shouldPlay) playAudio(); });
  }

  function toggleLoop() {
    audio.loop = !audio.loop;
    loopButton.setAttribute("aria-pressed", String(audio.loop));
    showToast(audio.loop ? "Repeat on" : "Repeat off");
  }

  function toggleShuffle() {
    const enabled = shuffleButton.getAttribute("aria-pressed") !== "true";
    shuffleButton.setAttribute("aria-pressed", String(enabled));
    showToast(enabled ? "Shuffle on" : "Shuffle off");
  }

  function updateVolumeFill() {
    volumeSlider.style.setProperty("--fill", `${Number(volumeSlider.value) * 100}%`);
    muteButton.classList.toggle("is-muted", audio.muted || audio.volume === 0);
  }

  function setVolume(value) {
    audio.volume = Math.min(1, Math.max(0, value));
    if (audio.volume > 0) audio.muted = false;
    volumeSlider.value = audio.volume;
    localStorage.setItem("setPlayerVolume", String(audio.volume));
    updateVolumeFill();
  }

  function removeTrack(index) {
    const [removed] = tracks.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    if (!tracks.length) {
      resetPlayer();
    } else if (index === activeIndex) {
      activeIndex = Math.min(index, tracks.length - 1);
      loadTrack(activeIndex);
    } else {
      if (index < activeIndex) activeIndex--;
      renderQueue();
    }
  }

  function resetPlayer() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    activeIndex = -1;
    decodedPeaks = null;
    deck.classList.remove("has-track");
    playButton.disabled = true;
    trackTitle.textContent = "No set loaded";
    trackMeta.textContent = "Choose audio to begin";
    statusText.lastChild.textContent = " Ready";
    statusText.classList.remove("playing");
    currentTime.textContent = "00:00";
    remainingTime.textContent = "−00:00";
    playhead.style.left = "0%";
    renderQueue();
    drawIdleWaveform();
  }

  function clearQueue() {
    tracks.forEach((track) => URL.revokeObjectURL(track.url));
    tracks = [];
    resetPlayer();
    showToast("Queue cleared");
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawIdleWaveform();
  }

  function drawIdleWaveform() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    const center = height / 2;
    const count = Math.max(45, Math.floor(width / 3.5));
    const gap = width / count;
    const progress = audio.duration ? audio.currentTime / audio.duration : 0;

    for (let i = 0; i < count; i++) {
      const x = i * gap + gap / 2;
      let amplitude;
      if (decodedPeaks) {
        const peakIndex = Math.min(decodedPeaks.length - 1, Math.floor(i / count * decodedPeaks.length));
        amplitude = Math.max(.035, decodedPeaks[peakIndex]) * height * .82;
      } else {
        const wave = Math.sin(i * .61) * .42 + Math.sin(i * .17 + 1.3) * .32 + Math.sin(i * .09) * .2;
        amplitude = (12 + Math.abs(wave) * height * .32) * (activeIndex >= 0 ? 1 : .36);
      }
      ctx.fillStyle = i / count <= progress ? "#d9ff57" : "#44463f";
      ctx.fillRect(Math.round(x), Math.round(center - amplitude / 2), 1.25, Math.max(2, Math.round(amplitude)));
    }
  }

  function animateWaveform() {
    if (!analyser || audio.paused) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, width, height);
    const center = height / 2;
    const count = Math.max(45, Math.floor(width / 3.5));
    const gap = width / count;
    const progress = audio.duration ? audio.currentTime / audio.duration : 0;

    for (let i = 0; i < count; i++) {
      const x = i * gap + gap / 2;
      const base = decodedPeaks ? decodedPeaks[Math.min(decodedPeaks.length - 1, Math.floor(i / count * decodedPeaks.length))] : .12;
      const frequency = data[Math.floor(i / count * data.length)] / 255;
      const amplitude = Math.max(3, (base * .72 + frequency * .28) * height * .8);
      ctx.fillStyle = i / count <= progress ? "#d9ff57" : "#44463f";
      ctx.fillRect(Math.round(x), Math.round(center - amplitude / 2), 1.25, Math.max(2, Math.round(amplitude)));
    }
    animationFrame = requestAnimationFrame(animateWaveform);
  }

  fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  playButton.addEventListener("click", togglePlayback);
  $("#backButton").addEventListener("click", () => seekBy(-15));
  $("#forwardButton").addEventListener("click", () => seekBy(15));
  $("#previousButton").addEventListener("click", previousTrack);
  $("#loopButton").addEventListener("click", toggleLoop);
  $("#shuffleButton").addEventListener("click", toggleShuffle);
  clearButton.addEventListener("click", clearQueue);

  queueList.addEventListener("click", (event) => {
    const playTarget = event.target.closest("[data-play]");
    const removeTarget = event.target.closest("[data-remove]");
    if (playTarget) {
      const index = Number(playTarget.dataset.play);
      loadTrack(index).then(playAudio);
    }
    if (removeTarget) removeTrack(Number(removeTarget.dataset.remove));
  });

  volumeSlider.addEventListener("input", () => setVolume(Number(volumeSlider.value)));
  muteButton.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateVolumeFill();
    showToast(audio.muted ? "Muted" : "Sound on");
  });

  speedSelect.addEventListener("change", () => {
    audio.playbackRate = Number(speedSelect.value);
    showToast(`Speed ${speedSelect.options[speedSelect.selectedIndex].text}`);
  });

  visualizer.addEventListener("pointerdown", (event) => {
    seekFromPointer(event);
    visualizer.setPointerCapture(event.pointerId);
  });
  visualizer.addEventListener("pointermove", (event) => {
    if (visualizer.hasPointerCapture(event.pointerId)) seekFromPointer(event);
  });
  visualizer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(event.key === "ArrowLeft" ? -15 : 15);
    }
  });

  ["dragenter", "dragover"].forEach((type) => document.addEventListener(type, (event) => {
    event.preventDefault();
    deck.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((type) => document.addEventListener(type, (event) => {
    event.preventDefault();
    if (type === "drop") addFiles(event.dataTransfer.files);
    if (!event.relatedTarget || type === "drop") deck.classList.remove("is-dragging");
  }));

  audio.addEventListener("play", updatePlaybackUI);
  audio.addEventListener("pause", updatePlaybackUI);
  audio.addEventListener("timeupdate", updateTime);
  audio.addEventListener("loadedmetadata", () => {
    const track = tracks[activeIndex];
    if (track) {
      track.duration = audio.duration;
      trackMeta.textContent = `${formatTime(audio.duration)} / ${track.file.type || "Audio"}`;
      renderQueue();
    }
    updateTime();
  });
  audio.addEventListener("ended", () => { if (!audio.loop) nextTrack(); });
  audio.addEventListener("error", () => {
    if (audio.src) showToast("This audio format could not be played");
  });

  $("#shortcutsButton").addEventListener("click", () => shortcutsDialog.showModal());
  $("#closeDialog").addEventListener("click", () => shortcutsDialog.close());
  shortcutsDialog.addEventListener("click", (event) => {
    if (event.target === shortcutsDialog) shortcutsDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target.matches("input, select") || shortcutsDialog.open) return;
    const key = event.key.toLowerCase();
    if (key === " " && activeIndex >= 0) { event.preventDefault(); togglePlayback(); }
    else if (key === "arrowleft") { event.preventDefault(); seekBy(-15); }
    else if (key === "arrowright") { event.preventDefault(); seekBy(15); }
    else if (key === "arrowup") { event.preventDefault(); setVolume(audio.volume + .05); }
    else if (key === "arrowdown") { event.preventDefault(); setVolume(audio.volume - .05); }
    else if (key === "n") nextTrack();
    else if (key === "p") previousTrack();
    else if (key === "l") toggleLoop();
    else if (key === "m") muteButton.click();
    else if (key === "?") shortcutsDialog.showModal();
  });

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("beforeunload", () => tracks.forEach((track) => URL.revokeObjectURL(track.url)));
  resizeCanvas();
})();
