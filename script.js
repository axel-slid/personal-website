
(function(){
  const root = document.documentElement;

  const stored = localStorage.getItem("theme");
  if(stored){ root.setAttribute("data-theme", stored); }

  function setTheme(t){
    root.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    document.querySelectorAll('[data-set-theme]').forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('data-set-theme') === t ? 'true' : 'false');
    });
  }

  document.addEventListener("click", (e) => {
    const themeLink = e.target.closest && e.target.closest("[data-set-theme]");
    if(themeLink){
      e.preventDefault();
      setTheme(themeLink.getAttribute("data-set-theme"));
      return;
    }

    const a = e.target.closest && e.target.closest("a[href]");
    if(!a) return;
    if(a.hasAttribute("data-no-transition")) return;

    const href = a.getAttribute("href") || "";
    if(href.startsWith("#")) return;
    if(href.startsWith("transition.html")) return;
    if(href.startsWith("index.html") || href.startsWith("story.html")) return;

    if(href.startsWith("assets/")) return;
    if(href.endsWith(".pdf") || href.endsWith(".png") || href.endsWith(".jpg") || href.endsWith(".jpeg") || href.endsWith(".gif") || href.endsWith(".svg") || href.endsWith(".mov") || href.endsWith(".mp4")) return;

    try{
      const url = new URL(href, window.location.href);
      const isExternal = url.origin !== window.location.origin;
      if(isExternal){
        e.preventDefault();
        window.location.href = "transition.html?to=" + encodeURIComponent(url.href);
      }
    }catch(err){}
  });

  const current = root.getAttribute("data-theme") || "light";
  document.querySelectorAll('[data-set-theme]').forEach(a => {
    a.setAttribute('aria-current', a.getAttribute('data-set-theme') === current ? 'true' : 'false');
  });

  const bar = document.getElementById("progress");
  function onScroll(){
    if(!bar) return;
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const height = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.max(0, (scrolled/height)*100));
    bar.style.width = pct + "%";
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  // --- Site editor (password-protected) ---
  const editBtn = document.getElementById("editBtn");
  const today = new Date().toISOString().slice(0,10);

  function pagePath(){
    const p = (window.location.pathname || "").split("/").pop();
    if(!p || p === "") return "index.html";
    return p;
  }

  function setLastUpdated(){
    document.querySelectorAll(".footer div").forEach(d => {
      if(d.textContent && d.textContent.trim().startsWith("Last updated:")){
        d.textContent = "Last updated: " + today;
      }
    });
  }

  function injectEditorUI(){
    if(document.getElementById("editorModal")) return;

    const modal = document.createElement("div");
    modal.className = "editor-modal";
    modal.id = "editorModal";
    modal.innerHTML = `
      <div class="panel" role="dialog" aria-modal="true" aria-label="Editor login">
        <div style="font-weight:800; font-size:16px;">Enter editor password</div>
        <div class="editor-pill" style="margin-top:6px;">This unlocks in-browser editing and pushes changes to GitHub.</div>
        <div class="row">
          <input id="editorPassword" type="password" placeholder="Password" autocomplete="current-password" />
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="editor-btn" id="editorCancel" type="button">Cancel</button>
          <button class="editor-btn primary" id="editorLogin" type="button">Unlock</button>
        </div>
        <div id="editorErr" class="editor-pill" style="margin-top:8px;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const bar = document.createElement("div");
    bar.className = "editor-bar";
    bar.id = "editorBar";
    bar.innerHTML = `
      <div class="left">
        <div class="editor-pill">Edit mode</div>
        <button class="editor-btn" id="addProjectBtn" type="button">Add project</button>
        <button class="editor-btn" id="addResearchBtn" type="button">Add research card</button>
        <button class="editor-btn" id="addNewsBtn" type="button">Add news post</button>
        <label class="editor-btn" style="display:inline-flex; gap:8px; align-items:center;">
          Upload media
          <input id="mediaFile" type="file" style="display:none" />
        </label>
      </div>
      <div class="right">
        <button class="editor-btn" id="exitEditBtn" type="button">Exit</button>
        <button class="editor-btn primary" id="saveEditBtn" type="button">Save to GitHub</button>
      </div>
    `;
    document.body.appendChild(bar);
  }

  async function apiPost(url, payload){
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(()=> ({}));
    if(!resp.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function enableEditing(){
    document.body.setAttribute("data-editing","true");
    const bar = document.getElementById("editorBar");
    if(bar) bar.style.display = "flex";

    const selectors = [
      "main h1","main h2","main h3",
      "main .p","main .quote","main .links",
      "main .proj-title","main .proj-meta","main .proj-desc","main .proj-more",
      "main .card-title","main .card-desc",
      "main .news-title","main .news-meta","main .news-body"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(el => {
      el.classList.add("editable");
      el.setAttribute("contenteditable","true");
      el.setAttribute("spellcheck","true");
    });

    // make media captions/alt easy to edit by allowing editing within thumbs if present
    document.querySelectorAll(".media-strip").forEach(ms => {
      ms.classList.add("editable");
      ms.setAttribute("contenteditable","true");
    });
  }

  function disableEditing(){
    document.body.removeAttribute("data-editing");
    const bar = document.getElementById("editorBar");
    if(bar) bar.style.display = "none";
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute("contenteditable");
    });
  }

  function showModal(){
    injectEditorUI();
    const modal = document.getElementById("editorModal");
    const err = document.getElementById("editorErr");
    if(err) err.textContent = "";
    if(modal) modal.style.display = "flex";
    const inp = document.getElementById("editorPassword");
    setTimeout(()=> inp && inp.focus(), 0);
  }

  function hideModal(){
    const modal = document.getElementById("editorModal");
    if(modal) modal.style.display = "none";
  }

  async function login(password){
    const r = await apiPost("/api/auth", { password });
    sessionStorage.setItem("editorToken", r.token);
    return r.token;
  }

  function getToken(){
    return sessionStorage.getItem("editorToken") || "";
  }

  async function saveToGitHub(){
    const token = getToken();
    if(!token) throw new Error("Not logged in");

    setLastUpdated();
    const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    const path = pagePath();
    await apiPost("/api/save", {
      token,
      path,
      content: html,
      message: `Edit ${path} via site editor`
    });
  }

  function insertProject(){
    const container = document.getElementById("misc-projects") || document.getElementById("projects");
    if(!container) return;
    const wrap = document.createElement("div");
    wrap.className = "proj";
    wrap.innerHTML = `
      <div class="proj-top">
        <div>
          <div class="proj-title"><a href="#" onclick="return false;">New project</a></div>
          <div class="proj-meta">Tech · Links</div>
          <div class="proj-desc">One-line summary.</div>
          <div class="proj-more">A slightly longer explanation: what you built, why it mattered, and what the results were.</div>
        </div>
      </div>
    `;
    container.appendChild(wrap);
    wrap.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function insertResearchCard(){
    const container = document.querySelector("#research-preview .cards");
    if(!container) return;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-title">New research item</div>
      <div class="card-desc">Describe the question, approach, and outcome.</div>
    `;
    container.appendChild(card);
    card.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function insertNewsPost(){
    const container = document.getElementById("news");
    if(!container) {
      // If we're not on the news page, just navigate there.
      window.location.href = "news.html";
      return;
    }
    const item = document.createElement("div");
    item.className = "news-item";
    item.innerHTML = `
      <div class="news-title">New update</div>
      <div class="news-meta">${today}</div>
      <div class="news-body">Write the update here.</div>
    `;
    container.appendChild(item);
    item.scrollIntoView({behavior:"smooth", block:"center"});
  }

  async function uploadMedia(file){
    const token = getToken();
    if(!token) throw new Error("Not logged in");

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const comma = dataUrl.indexOf(",");
        resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `assets/${safeName}`;
    await apiPost("/api/upload", {
      token,
      path,
      base64,
      message: `Upload ${path} via site editor`
    });
    return path;
  }

  function wireEditorButtons(){
    const cancel = document.getElementById("editorCancel");
    const loginBtn = document.getElementById("editorLogin");
    const pw = document.getElementById("editorPassword");
    const err = document.getElementById("editorErr");

    cancel && cancel.addEventListener("click", hideModal);
    loginBtn && loginBtn.addEventListener("click", async () => {
      try{
        err.textContent = "";
        const token = await login(pw.value || "");
        hideModal();
        enableEditing();
      }catch(e){
        err.textContent = e.message || "Login failed";
      }
    });

    pw && pw.addEventListener("keydown", (e)=> {
      if(e.key === "Enter") loginBtn && loginBtn.click();
      if(e.key === "Escape") hideModal();
    });

    const saveBtn = document.getElementById("saveEditBtn");
    const exitBtn = document.getElementById("exitEditBtn");
    const addProj = document.getElementById("addProjectBtn");
    const addRes = document.getElementById("addResearchBtn");
    const addNews = document.getElementById("addNewsBtn");
    const mediaFile = document.getElementById("mediaFile");

    addProj && addProj.addEventListener("click", insertProject);
    addRes && addRes.addEventListener("click", insertResearchCard);
    addNews && addNews.addEventListener("click", insertNewsPost);

    exitBtn && exitBtn.addEventListener("click", () => {
      disableEditing();
    });

    saveBtn && saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      const prev = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      try{
        await saveToGitHub();
        saveBtn.textContent = "Saved ✓";
        setTimeout(()=> saveBtn.textContent = prev, 900);
      }catch(e){
        alert(e.message || "Save failed");
        saveBtn.textContent = prev;
      }finally{
        saveBtn.disabled = false;
      }
    });

    mediaFile && mediaFile.addEventListener("change", async () => {
      if(!mediaFile.files || !mediaFile.files[0]) return;
      try{
        const path = await uploadMedia(mediaFile.files[0]);
        // Insert a thumbnail link at the cursor (or append to the last project)
        const lastProj = document.querySelector(".proj:last-of-type .media-strip") || document.querySelector(".proj:last-of-type") || document.querySelector("main");
        const strip = document.querySelector(".proj:last-of-type .media-strip") || (()=> {
          const p = document.querySelector(".proj:last-of-type");
          if(!p) return null;
          const s = document.createElement("div");
          s.className = "media-strip";
          p.appendChild(s);
          return s;
        })();
        if(strip){
          const a = document.createElement("a");
          a.className = "thumb";
          a.href = path;
          a.innerHTML = `<img src="${path}" alt="" loading="lazy" />`;
          strip.appendChild(a);
        }
        alert(`Uploaded: ${path}\n(You may need a redeploy for the asset to show if the CDN caches aggressively.)`);
      }catch(e){
        alert(e.message || "Upload failed");
      }finally{
        mediaFile.value = "";
      }
    });
  }

  if(editBtn){
    injectEditorUI();
    wireEditorButtons();

    editBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const token = getToken();
      if(token){
        enableEditing();
      }else{
        showModal();
      }
    });
  }
})();
