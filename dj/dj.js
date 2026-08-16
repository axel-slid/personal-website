(function () {
  const data = window.SUMMER_SET;
  const list = document.querySelector("[data-track-list]");
  const search = document.querySelector("[data-track-search]");
  const toggle = document.querySelector("[data-show-tracks]");
  const empty = document.querySelector("[data-no-results]");
  const synced = document.querySelector("#synced-count");
  if (!data || !list || !search || !toggle) return;

  let expanded = false;
  const initialCount = 16;
  synced.textContent = String(data.syncedCount);

  function createCell(className, text, role) {
    const cell = document.createElement("span");
    cell.className = className;
    cell.setAttribute("role", role || "cell");
    cell.textContent = text;
    return cell;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = data.tracks.filter((track) => {
      const haystack = `${track.title} ${track.artists.join(" ")}`.toLocaleLowerCase();
      return !query || haystack.includes(query);
    });
    const visible = query || expanded ? matches : matches.slice(0, initialCount);
    const fragment = document.createDocumentFragment();

    visible.forEach((track) => {
      const row = document.createElement("div");
      row.className = "track-row";
      row.setAttribute("role", "row");
      row.appendChild(createCell("track-number", String(track.n)));

      const trackCell = document.createElement("span");
      trackCell.className = "track-name";
      trackCell.setAttribute("role", "cell");
      const title = document.createElement("strong");
      title.textContent = track.title;
      const artist = document.createElement("small");
      artist.textContent = track.artists.join(", ");
      trackCell.append(title, artist);
      row.appendChild(trackCell);

      row.appendChild(createCell("track-meta", `${track.bpm} / ${track.key}`));
      row.appendChild(createCell(`cue-time cue-a-time${track.cueA ? "" : " missing"}`, track.cueA || "—"));
      row.appendChild(createCell(`cue-time cue-b-time${track.cueB ? "" : " missing"}`, track.cueB || "—"));
      fragment.appendChild(row);
    });

    list.replaceChildren(fragment);
    empty.hidden = matches.length !== 0;
    toggle.hidden = Boolean(query) || matches.length <= initialCount;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.innerHTML = expanded ? 'Show less <span aria-hidden="true">↑</span>' : `View all ${data.trackCount} tracks <span aria-hidden="true">↓</span>`;
  }

  search.addEventListener("input", render);
  toggle.addEventListener("click", () => {
    expanded = !expanded;
    render();
    if (!expanded) document.querySelector(".cue-sheet").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  render();
})();
