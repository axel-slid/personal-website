(() => {
  const workflows = Array.isArray(window.BSCODE_WORKFLOWS)
    ? window.BSCODE_WORKFLOWS
    : [];

  const canvas = document.getElementById("twinCanvas");
  const viewport = document.getElementById("twinViewport");
  const status = document.getElementById("twinStatus");
  const workflowLabel = document.getElementById("twinWorkflowLabel");
  const stepCount = document.getElementById("twinStepCount");
  const pauseButton = document.getElementById("twinPauseButton");
  const replayButton = document.getElementById("twinReplayButton");
  const cursor = document.getElementById("twinCursor");
  const clickPulse = document.getElementById("twinClick");
  const keypress = document.getElementById("twinKeypress");
  const address = document.getElementById("twinAddress");
  const agentCount = document.getElementById("twinAgentCount");
  const recentLocal = document.getElementById("twinRecentLocal");
  const newTabButton = document.getElementById("twinNewTab");
  const outputFile = document.getElementById("twinOutputFile");
  const taskFields = Array.from(document.querySelectorAll(".typed-task"));
  const agentStates = Array.from(document.querySelectorAll(".agent-state"));
  const workflowButtons = Array.from(document.querySelectorAll("[data-workflow]"));
  const chapterButtons = Array.from(document.querySelectorAll("[data-jump-workflow]"));
  const mentionButtons = Array.from(document.querySelectorAll("[data-mention-agent]"));
  const petTarget = document.querySelector(".pixel-pet-target");
  const productTwin = document.getElementById("productTwin");
  const cinematicMentionToken = document.querySelector(".cinematic-mention-token");
  const cinematicCommandCopy = document.querySelector(".cinematic-command-copy");
  const progressItems = Array.from(document.querySelectorAll(".zen-view li.working"));

  if (!canvas || !viewport || workflows.length === 0) return;

  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentWorkflowId = workflows[0].id;
  let runToken = 0;
  let paused = false;
  let hasStarted = false;

  const taskCopies = [
    "Audit the API error handling",
    "Map the output preview flow",
    "Review keyboard workflows",
    "Validate responsive layouts"
  ];
  const mentionAccents = {
    Mario: "#6aaeff",
    Alayah: "#dd956b",
    Matilda: "#a58ad7",
    Aurelia: "#78b99c"
  };

  function setCinematicPrompt({ mention = "", copy = "What should we work on?", accent = "#6aaeff" } = {}) {
    cinematicMentionToken.textContent = mention;
    cinematicMentionToken.style.setProperty("--mention-color", accent);
    cinematicCommandCopy.textContent = copy;
  }

  progressItems.forEach((item) => {
    const badge = item.querySelector("span");
    if (badge) badge.dataset.initialText = badge.textContent;
  });

  function motionDuration(milliseconds) {
    return reducedMotion.matches ? Math.min(40, milliseconds) : milliseconds;
  }

  async function wait(milliseconds, token) {
    let elapsed = 0;
    const target = motionDuration(milliseconds);
    while (elapsed < target && token === runToken) {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      if (!paused) elapsed += 40;
    }
    return token === runToken;
  }

  function clearTwinClasses() {
    canvas.className = "twin-canvas";
    recentLocal.classList.remove("is-target");
    outputFile.classList.remove("is-target");
    progressItems.forEach((item) => {
      item.classList.add("working");
      item.classList.remove("done");
      const badge = item.querySelector("span");
      if (badge?.dataset.initialText) badge.textContent = badge.dataset.initialText;
    });
  }

  function setView(view) {
    canvas.dataset.view = view;
    if (view === "home") {
      address.textContent = "No workspace selected";
    } else if (view === "workspace") {
      address.textContent = "local · ~/Projects/bscode · 4 agent slots";
    }
    window.requestAnimationFrame(scaleTwin);
  }

  function resetTwin(view = "workspace") {
    clearTwinClasses();
    setView(view);
    taskFields.forEach((field) => {
      field.textContent = "";
    });
    agentStates.forEach((state, index) => {
      state.textContent = index === 0 ? "Planning" : "Working";
    });
    agentCount.textContent = "0/4 agents · idle";
    setCinematicPrompt();
    keypress.classList.remove("is-visible");
    hideCursor();
  }

  function showCursor(x, y) {
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    cursor.classList.add("is-visible");
  }

  function hideCursor() {
    cursor.classList.remove("is-visible");
  }

  function pulseAt(x, y) {
    clickPulse.style.left = `${x}px`;
    clickPulse.style.top = `${y}px`;
    clickPulse.classList.remove("is-clicking");
    void clickPulse.offsetWidth;
    clickPulse.classList.add("is-clicking");
  }

  async function clickAt(x, y, token) {
    showCursor(x, y);
    if (!(await wait(520, token))) return false;
    pulseAt(x + 3, y + 4);
    return wait(280, token);
  }

  async function pressKey(label, x, y, token) {
    hideCursor();
    keypress.textContent = label;
    keypress.style.left = `${x}px`;
    keypress.style.top = `${y}px`;
    keypress.classList.add("is-visible");
    if (!(await wait(520, token))) return false;
    keypress.classList.remove("is-visible");
    return wait(260, token);
  }

  async function typeInto(element, text, token) {
    element.textContent = "";
    if (reducedMotion.matches) {
      element.textContent = text;
      return token === runToken;
    }
    for (const character of text) {
      if (token !== runToken) return false;
      while (paused && token === runToken) {
        await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
      element.textContent += character;
      await new Promise((resolve) => window.setTimeout(resolve, motionDuration(28)));
    }
    return token === runToken;
  }

  function primeRunningTeam({ zen = false, complete = false, outputs = false } = {}) {
    resetTwin("workspace");
    taskFields.forEach((field, index) => {
      field.textContent = taskCopies[index];
    });
    canvas.classList.add("is-started", "is-team");
    agentStates.forEach((state) => {
      state.textContent = "Working";
    });
    agentCount.textContent = "4/4 agents · 4 working";
    if (zen) canvas.classList.add("is-zen");
    if (complete) {
      canvas.classList.add("is-complete");
      agentStates.forEach((state) => {
        state.textContent = "Idle";
      });
      progressItems.forEach((item) => {
        item.classList.remove("working");
        item.classList.add("done");
        const badge = item.querySelector("span");
        if (badge) badge.textContent = "done";
      });
      agentCount.textContent = "0/4 agents · idle";
    }
    if (outputs) canvas.classList.add("is-output-list");
  }

  async function runAction(action, token) {
    switch (action) {
      case "show-home":
        resetTwin("home");
        await wait(700, token);
        break;

      case "focus-recent":
        setView("home");
        recentLocal.classList.add("is-target");
        showCursor(842, 566);
        await wait(1050, token);
        break;

      case "open-workspace":
        if (!(await clickAt(842, 566, token))) break;
        resetTwin("workspace");
        address.textContent = "local · ~/Projects/bscode · 4 agent slots";
        await wait(1200, token);
        break;

      case "show-empty-grid":
        resetTwin("workspace");
        showCursor(392, 235);
        await wait(750, token);
        break;

      case "type-task":
        resetTwin("workspace");
        showCursor(392, 235);
        await wait(420, token);
        await typeInto(taskFields[0], taskCopies[0], token);
        await wait(650, token);
        break;

      case "start-agent":
        if (!(await pressKey("↵ Enter", 454, 256, token))) break;
        canvas.classList.add("is-started");
        agentCount.textContent = "1/4 agents · 1 planning";
        await wait(1500, token);
        break;

      case "start-team":
        taskFields.forEach((field, index) => {
          field.textContent = taskCopies[index];
        });
        canvas.classList.add("is-started", "is-team");
        agentStates.forEach((state) => {
          state.textContent = "Working";
        });
        agentCount.textContent = "4/4 agents · 4 working";
        hideCursor();
        await wait(1500, token);
        break;

      case "show-running":
        primeRunningTeam();
        await wait(850, token);
        break;

      case "open-zen":
        primeRunningTeam();
        showCursor(525, 137);
        await wait(600, token);
        pulseAt(528, 140);
        canvas.classList.add("is-zen");
        await wait(1200, token);
        break;

      case "advance-checklist":
        primeRunningTeam({ zen: true });
        progressItems.forEach((item, index) => {
          if (index % 2 === 0) {
            item.classList.remove("working");
            item.classList.add("done");
            const eta = item.querySelector("span");
            if (eta) eta.textContent = "done";
          }
        });
        showCursor(425, 255);
        await wait(1500, token);
        break;

      case "complete-work":
        primeRunningTeam({ zen: true, complete: true, outputs: true });
        hideCursor();
        await wait(1200, token);
        break;

      case "show-complete":
        primeRunningTeam({ complete: true, outputs: true });
        await wait(850, token);
        break;

      case "focus-output":
        primeRunningTeam({ complete: true, outputs: true });
        outputFile.classList.add("is-target");
        showCursor(1080, 176);
        await wait(1150, token);
        break;

      case "open-preview":
        primeRunningTeam({ complete: true, outputs: true });
        if (!(await clickAt(1080, 176, token))) break;
        canvas.classList.add("is-output-preview");
        outputFile.classList.add("is-target");
        await wait(1500, token);
        break;

      case "open-cinematic":
        primeRunningTeam();
        if (!(await pressKey("⌘K", 1066, 20, token))) break;
        resetTwin("cinematic");
        await wait(1450, token);
        break;

      case "mention-agent":
        resetTwin("cinematic");
        showCursor(540, 628);
        await wait(450, token);
        setCinematicPrompt({ mention: "@", copy: "" });
        canvas.classList.add("is-mentioning");
        await wait(1450, token);
        break;

      case "send-command":
        resetTwin("cinematic");
        setCinematicPrompt({
          mention: "@Mario",
          copy: " summarize the API findings",
          accent: mentionAccents.Mario
        });
        canvas.classList.add("is-mentioning");
        if (!(await pressKey("↵ Enter", 792, 595, token))) break;
        canvas.classList.remove("is-mentioning");
        canvas.classList.add("is-sent");
        await wait(1350, token);
        break;

      case "open-pixel":
        primeRunningTeam();
        if (!(await clickAt(1093, 20, token))) break;
        resetTwin("pixel");
        await wait(1400, token);
        break;

      case "focus-floor":
        resetTwin("pixel");
        await clickAt(291, 503, token);
        await wait(1100, token);
        break;

      case "inspect-pet":
        resetTwin("pixel");
        if (!(await clickAt(645, 378, token))) break;
        canvas.classList.add("is-pet-open");
        await wait(1500, token);
        break;
    }
  }

  function updateWorkflowSelection(id) {
    workflowButtons.forEach((button) => {
      const selected = button.dataset.workflow === id;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && productTwin) productTwin.setAttribute("aria-labelledby", button.id);
    });
  }

  async function playWorkflow(id, { fromStart = true } = {}) {
    const workflow = workflowById.get(id);
    if (!workflow) return;

    currentWorkflowId = id;
    const token = ++runToken;
    paused = false;
    pauseButton.textContent = "Pause";
    pauseButton.setAttribute("aria-label", "Pause workflow");
    updateWorkflowSelection(id);
    workflowLabel.textContent = workflow.label;
    window.requestAnimationFrame(scaleTwin);

    if (fromStart) {
      resetTwin(id === "workspace" ? "home" : "workspace");
    }

    if (reducedMotion.matches) {
      const finalStep = workflow.steps.at(-1);
      status.textContent = finalStep.copy;
      stepCount.textContent = `${workflow.steps.length} / ${workflow.steps.length}`;
      await runAction(finalStep.action, token);
      hideCursor();
      return;
    }

    for (let index = 0; index < workflow.steps.length; index += 1) {
      if (token !== runToken) return;
      const step = workflow.steps[index];
      status.textContent = step.copy;
      stepCount.textContent = `${index + 1} / ${workflow.steps.length}`;
      await runAction(step.action, token);
    }

    if (token === runToken) hideCursor();
  }

  function scaleTwin() {
    const width = viewport.clientWidth;
    if (!width) return;

    const scale = Math.min(1.12, Math.max(0.78, width / 1200));
    const scaledWidth = 1200 * scale;
    const compact = scaledWidth > width;
    let left = 0;

    if (compact) {
      const cropMap = {
        workspace: 210,
        delegate: 225,
        progress: 225,
        output: 650,
        cinematic: 220,
        pixel: 220
      };
      const crop = cropMap[currentWorkflowId] ?? 220;
      left = Math.max(width - scaledWidth, -crop * scale);
    } else if (scaledWidth < width) {
      left = (width - scaledWidth) / 2;
    }

    canvas.style.left = `${Math.round(left)}px`;
    canvas.style.transform = `scale(${scale})`;
    viewport.style.height = `${Math.round(675 * scale)}px`;
  }

  workflowButtons.forEach((button, buttonIndex) => {
    button.addEventListener("click", () => {
      playWorkflow(button.dataset.workflow);
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = buttonIndex;
      if (event.key === "ArrowLeft") nextIndex = (buttonIndex - 1 + workflowButtons.length) % workflowButtons.length;
      if (event.key === "ArrowRight") nextIndex = (buttonIndex + 1) % workflowButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = workflowButtons.length - 1;
      workflowButtons[nextIndex].focus();
      workflowButtons[nextIndex].click();
    });
  });

  chapterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("workflows")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
      window.setTimeout(() => playWorkflow(button.dataset.jumpWorkflow), reducedMotion.matches ? 0 : 420);
    });
  });

  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-label", paused ? "Resume workflow" : "Pause workflow");
  });

  replayButton.addEventListener("click", () => {
    playWorkflow(currentWorkflowId);
  });

  recentLocal.addEventListener("click", () => playWorkflow("workspace"));
  newTabButton?.addEventListener("click", () => {
    runToken += 1;
    resetTwin("home");
    status.textContent = "A new workspace tab opens at Home without changing any Pixel floor.";
    stepCount.textContent = "Ready";
  });
  outputFile.addEventListener("click", () => playWorkflow("output"));
  mentionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      runToken += 1;
      paused = false;
      pauseButton.textContent = "Pause";
      pauseButton.setAttribute("aria-label", "Pause workflow");
      const agentName = button.dataset.mentionAgent;
      setCinematicPrompt({
        mention: `@${agentName}`,
        copy: " ",
        accent: mentionAccents[agentName]
      });
      canvas.classList.add("is-mentioning");
      canvas.classList.remove("is-sent");
      status.textContent = `Command will be routed to ${button.dataset.mentionAgent}.`;
    });
  });
  petTarget?.addEventListener("click", () => {
    runToken += 1;
    paused = false;
    canvas.classList.add("is-pet-open");
    status.textContent = "Nibbles’ live floor profile is open.";
  });

  const resizeObserver = new ResizeObserver(scaleTwin);
  resizeObserver.observe(viewport);
  window.addEventListener("resize", scaleTwin, { passive: true });

  const startObserver = new IntersectionObserver((entries) => {
    if (hasStarted || !entries.some((entry) => entry.isIntersecting)) return;
    hasStarted = true;
    playWorkflow(currentWorkflowId);
  }, { threshold: 0.18 });

  startObserver.observe(document.getElementById("productTwin"));
  resetTwin("home");
  scaleTwin();
})();
