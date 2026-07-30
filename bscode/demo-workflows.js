window.BSCODE_WORKFLOWS = [
  {
    id: "workspace",
    index: "01",
    label: "Open a workspace",
    shortLabel: "Workspace",
    detail: "Home → recent workspace → live files and agent slots",
    steps: [
      { action: "show-home", copy: "Start from Home, where local and SSH projects stay ready." },
      { action: "focus-recent", copy: "Choose the recent local workspace named “local.”" },
      { action: "open-workspace", copy: "BsCode restores its files, tabs, outputs, and four agent slots." }
    ]
  },
  {
    id: "delegate",
    index: "02",
    label: "Start an agent",
    shortLabel: "Delegate",
    detail: "Task → Enter → real terminal session",
    steps: [
      { action: "show-empty-grid", copy: "Each empty slot accepts a task and a runtime." },
      { action: "type-task", copy: "Type a task. Enter starts the default agent; Shift+Enter adds a line." },
      { action: "start-agent", copy: "Codex starts in the workspace and receives its own name and terminal." },
      { action: "start-team", copy: "Fill the remaining slots when the work benefits from parallel agents." }
    ]
  },
  {
    id: "progress",
    index: "03",
    label: "Track progress",
    shortLabel: "Progress",
    detail: "Terminal → Zen → checklist, ETA, and files",
    steps: [
      { action: "show-running", copy: "Live state and runtime stay visible on every agent." },
      { action: "open-zen", copy: "Switch to Zen view without stopping the underlying terminal." },
      { action: "advance-checklist", copy: "Current task, checklist, ETA, and relevant files update in place." },
      { action: "complete-work", copy: "Completed agents become idle while their result remains available." }
    ]
  },
  {
    id: "output",
    index: "04",
    label: "Review an output",
    shortLabel: "Outputs",
    detail: "Generated file → Outputs → embedded preview",
    steps: [
      { action: "show-complete", copy: "Generated artifacts appear with the agent that created them." },
      { action: "focus-output", copy: "Choose performance-report.md from Session files." },
      { action: "open-preview", copy: "Preview the result beside the agents without leaving the workspace." }
    ]
  },
  {
    id: "cinematic",
    index: "05",
    label: "Route a command",
    shortLabel: "Cinematic",
    detail: "⌘K → @agent → focused follow-up",
    steps: [
      { action: "show-running", copy: "The same live sessions can move into a distraction-free wall." },
      { action: "open-cinematic", copy: "Press ⌘K to enter Cinematic mode and focus the shared command dock." },
      { action: "mention-agent", copy: "Type @ to choose only from agents active in this workspace." },
      { action: "send-command", copy: "Submit once to route the follow-up directly to Mario." }
    ]
  },
  {
    id: "pixel",
    index: "06",
    label: "Enter the tower",
    shortLabel: "Pixel",
    detail: "Pixel mode → assigned floor → pet stats",
    steps: [
      { action: "open-pixel", copy: "Pixel mode maps the same running agents onto their tower floors." },
      { action: "focus-floor", copy: "Use the tower or arrow keys to move to an assigned floor." },
      { action: "inspect-pet", copy: "Click the floor companion to inspect HP, mood, food, hobbies, and talent." }
    ]
  }
];
