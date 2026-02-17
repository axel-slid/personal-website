
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

  // --- Content loader (Markdown/HTML from /content/*.md) ---
  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function looksLikeHtml(s){
    return /<\w+[^>]*>/.test(s);
  }

  // Minimal markdown renderer (headings, paragraphs, lists, links). Allows raw HTML passthrough.
  function renderMarkdown(md){
    if(!md) return "";
    if(looksLikeHtml(md)) return md; // treat as trusted HTML-in-markdown

    const lines = md.replace(/\r\n/g,'\n').split('\n');
    let out = [];
    let inList = false;
    const flushList = ()=>{ if(inList){ out.push('</ul>'); inList=false; } };
    const inline = (t)=>{
      // links [text](url)
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      // bold **x**
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // italics *x*
      t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return t;
    };

    for(const raw of lines){
      const line = raw.trimEnd();
      if(line.trim()===''){ flushList(); continue; }
      if(line.startsWith('# ')){ flushList(); out.push(`<h1>${inline(escapeHtml(line.slice(2)))}</h1>`); continue; }
      if(line.startsWith('## ')){ flushList(); out.push(`<h2>${inline(escapeHtml(line.slice(3)))}</h2>`); continue; }
      if(line.startsWith('### ')){ flushList(); out.push(`<h3>${inline(escapeHtml(line.slice(4)))}</h3>`); continue; }
      if(/^[-*]\s+/.test(line)){
        if(!inList){ out.push('<ul>'); inList=true; }
        out.push(`<li>${inline(escapeHtml(line.replace(/^[-*]\s+/,'')))}</li>`);
        continue;
      }
      flushList();
      out.push(`<div class="p">${inline(escapeHtml(line))}</div>`);
    }
    flushList();
    return out.join('\n');
  }

  async function loadMdRoots(){
    const roots = Array.from(document.querySelectorAll('.md-root[data-md]'));
    if(!roots.length) return;
    await Promise.all(roots.map(async (el)=>{
      const path = el.getAttribute('data-md');
      try{
        const resp = await fetch(path, { cache: 'no-store' });
        const txt = await resp.text();
        el.dataset.mdText = txt;
        el.innerHTML = renderMarkdown(txt);
      }catch(e){
        el.innerHTML = `<div class="p">Failed to load content.</div>`;
      }
    }));

    // footer last-updated from meta.json if present
    try{
      const r = await fetch('content/meta.json', { cache: 'no-store' });
      if(r.ok){
        const meta = await r.json();
        const d = meta && meta.lastUpdated;
        if(d){
          document.querySelectorAll('.footer div').forEach(div=>{
            if((div.textContent||'').trim().startsWith('Last updated:')){
              div.textContent = 'Last updated: ' + d;
            }
          });
        }
      }
    }catch(e){}
  }

  loadMdRoots();

  // --- Site editor (password-protected, role-based, draft/publish, diff, reorder) ---
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

    const consoleEl = document.createElement('div');
    consoleEl.className = 'editor-console';
    consoleEl.id = 'editorConsole';
    consoleEl.innerHTML = `
      <div class="editor-console-header">
        <div style="font-weight:900;">EDIT CONSOLE</div>
        <button class="editor-btn" id="closeConsoleBtn" type="button" title="Hide">×</button>
      </div>
      <div class="editor-console-body">
        <div class="editor-kv">
          <div>Status</div><div id="ecStatus">Locked</div>
          <div>Role</div><div id="ecRole">—</div>
          <div>Target</div>
          <div>
            <select id="ecTarget">
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
            </select>
          </div>
          <div>Page</div><div id="ecPage">${pagePath()}</div>
        </div>

        <div class="editor-console-row">
          <button class="editor-btn" id="ecReorder" type="button">Reorder</button>
          <button class="editor-btn" id="addProjectBtn" type="button">+ Project</button>
          <button class="editor-btn" id="addResearchBtn" type="button">+ Research</button>
          <button class="editor-btn" id="addNewsBtn" type="button">+ News</button>
          <label class="editor-btn" style="display:inline-flex; gap:8px; align-items:center;">
            Upload
            <input id="mediaFile" type="file" style="display:none" />
          </label>
        </div>

        <div class="editor-console-row">
          <button class="editor-btn" id="ecDiff" type="button">Show diff vs GitHub</button>
          <button class="editor-btn" id="exitEditBtn" type="button">Exit</button>
          <button class="editor-btn primary" id="saveDraftBtn" type="button">Save draft</button>
          <button class="editor-btn primary" id="publishBtn" type="button">Publish</button>
        </div>

        <div class="editor-pill" id="ecToast" style="display:none;"></div>

        <div style="font-weight:800; margin-top:8px;">Content (Markdown/HTML)</div>
        <textarea id="ecSource" class="editor-textarea" spellcheck="false"></textarea>

        <div style="font-weight:800; margin-top:8px;">Logs</div>
        <pre id="ecLogs" class="editor-logs"></pre>

        <div style="font-weight:800; margin-top:8px;">Diff</div>
        <pre id="ecDiffOut" class="editor-logs"></pre>
      </div>
    `;
    document.body.appendChild(consoleEl);
  }

  async function apiPost(url, payload){
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(()=> ({}));
    if(!resp.ok){
      const err = (data && data.error) ? data.error : "Request failed";
      const extra = (data && data.details) ? `\nDetails: ${JSON.stringify(data.details, null, 2)}` : "";
      throw new Error(`${err} (HTTP ${resp.status})${extra}`);
    }
    return data;
  }

  let editorState = { role: null, reorderOn: false };

  function log(msg){
    const out = document.getElementById('ecLogs');
    if(!out) return;
    out.textContent = (out.textContent ? out.textContent + "\n" : "") + `[${new Date().toLocaleTimeString()}] ${msg}`;
    out.scrollTop = out.scrollHeight;
  }

  function toast(msg, ok=true){
    const t = document.getElementById('ecToast');
    if(!t) return;
    t.style.display = 'block';
    t.textContent = msg;
    t.style.borderColor = ok ? 'rgba(80,200,120,.6)' : 'rgba(255,120,120,.6)';
    t.style.background = ok ? 'rgba(80,200,120,.08)' : 'rgba(255,120,120,.08)';
    setTimeout(()=>{ t.style.display='none'; }, 2500);
  }

  function currentMdEl(){
    return document.querySelector('.md-root[data-md]');
  }

  function enableEditing(){
    document.body.setAttribute('data-editing','true');
    const c = document.getElementById('editorConsole');
    if(c) c.style.display = 'flex';

    const el = currentMdEl();
    const src = document.getElementById('ecSource');
    if(el && src){
      src.value = el.dataset.mdText || el.innerHTML;
      // live preview
      src.oninput = ()=>{
        const txt = src.value || '';
        el.dataset.mdText = txt;
        el.innerHTML = renderMarkdown(txt);
      };
      // render once from textarea
      el.innerHTML = renderMarkdown(src.value);
    }

    document.getElementById('ecStatus').textContent = 'Authenticated ✓';
    document.getElementById('ecRole').textContent = editorState.role || 'editor';

    // role gating
    const publishBtn = document.getElementById('publishBtn');
    const target = document.getElementById('ecTarget');
    if(editorState.role !== 'admin'){
      publishBtn.disabled = true;
      publishBtn.title = 'Admin only';
      if(target) target.value = 'draft';
    }

    log('Edit mode enabled');
  }

  function disableEditing(){
    document.body.removeAttribute("data-editing");
    const c = document.getElementById('editorConsole');
    if(c) c.style.display = 'none';
    editorState.reorderOn = false;
    document.querySelectorAll('[draggable="true"]').forEach(el=> el.removeAttribute('draggable'));
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
    sessionStorage.setItem("editorRole", r.role || "editor");
    return r.token;
  }

  function getToken(){
    return sessionStorage.getItem("editorToken") || "";
  }

  async function saveToGitHub({ mode }){
    const token = getToken();
    if(!token) throw new Error("Not logged in");

    const el = currentMdEl();
    if(!el) throw new Error('No content root found');
    const mdPath = el.getAttribute('data-md');
    const content = (document.getElementById('ecSource')?.value) || el.dataset.mdText || '';

    const role = sessionStorage.getItem('editorRole') || 'editor';
    const isPublish = mode === 'publish';
    const branch = isPublish ? undefined : (process.env && process.env.DRAFT_BRANCH); // client can't read env; server defaults
    const req = {
      token,
      path: mdPath,
      content,
      message: isPublish ? `Publish ${mdPath}` : `Draft ${mdPath}`,
      branch: isPublish ? undefined : 'draft'
    };
    if(isPublish){ req.branch = undefined; }

    const res = await apiPost('/api/save', req);

    // update meta.json in same branch
    const meta = { lastUpdated: today };
    await apiPost('/api/save', {
      token,
      path: 'content/meta.json',
      content: JSON.stringify(meta, null, 2) + "\n",
      message: isPublish ? 'Update lastUpdated' : 'Update lastUpdated (draft)',
      branch: isPublish ? undefined : 'draft'
    });

    const sha = res && res.commitSha ? String(res.commitSha).slice(0,7) : null;
    log(`${isPublish ? 'Published' : 'Saved draft'} to GitHub${sha ? ` (${sha})` : ''}`);
    toast(`Committed to GitHub ✓${sha ? ` (${sha})` : ''}`);
  }

  function insertTemplate(kind){
    const src = document.getElementById('ecSource');
    if(!src) return;
    const todayLine = new Date().toISOString().slice(0,10);
    const templates = {
      project: `\n\n<div class="proj">\n  <div class="proj-top">\n    <div>\n      <div class="proj-title"><a href="#">New project</a></div>\n      <div class="proj-meta">Tech · Links</div>\n      <div class="proj-desc">One-line summary.</div>\n      <div class="proj-more">Longer description: what you built, why it mattered, results/impact, and anything notable.</div>\n    </div>\n  </div>\n</div>\n`,
      research: `\n\n<div class="proj">\n  <div class="proj-top">\n    <div>\n      <div class="proj-title">New research item</div>\n      <div class="proj-meta">Venue · ${todayLine}</div>\n      <div class="proj-desc">Authors</div>\n      <div class="proj-more">2–4 sentences: problem, method, contribution, result.</div>\n    </div>\n  </div>\n</div>\n`,
      news: `\n\n<div class="news-item">\n  <div class="news-title">New update</div>\n  <div class="news-meta">${todayLine}</div>\n  <div class="news-body">Write the update here.</div>\n</div>\n`
    };
    const ins = templates[kind];
    if(!ins) return;
    const start = src.selectionStart || src.value.length;
    const end = src.selectionEnd || src.value.length;
    src.value = src.value.slice(0,start) + ins + src.value.slice(end);
    src.selectionStart = src.selectionEnd = start + ins.length;
    src.dispatchEvent(new Event('input'));
    log(`Inserted ${kind} template`);
  }

  function toggleReorder(){
    const root = currentMdEl();
    if(!root) return;
    editorState.reorderOn = !editorState.reorderOn;

    const btn = document.getElementById('ecReorder');
    btn.textContent = editorState.reorderOn ? 'Reorder: ON' : 'Reorder';

    const sections = Array.from(root.querySelectorAll('section'));
    if(!sections.length){
      toast('No <section> blocks found to reorder', false);
      editorState.reorderOn = false;
      btn.textContent = 'Reorder';
      return;
    }

    function sectionLabel(sec){
      const h = sec.querySelector('h2,h3,h1');
      if(h && h.textContent.trim()) return h.textContent.trim();
      const id = sec.getAttribute('id');
      return id ? `#${id}` : 'Section';
    }

    function syncSource(){
      const src = document.getElementById('ecSource');
      if(src){
        src.value = root.innerHTML;
        src.dispatchEvent(new Event('input'));
      }
    }

    function move(sec, dir){
      const sib = dir < 0 ? sec.previousElementSibling : sec.nextElementSibling;
      if(!sib || sib.tagName.toLowerCase() !== 'section') return;
      if(dir < 0){
        sec.parentNode.insertBefore(sec, sib);
      }else{
        sec.parentNode.insertBefore(sib, sec);
      }
      syncSource();
      toast('Reordered');
      log(`Moved section: ${sectionLabel(sec)}`);
    }

    // Enable/disable UI affordances.
    sections.forEach(sec=>{
      if(editorState.reorderOn){
        sec.setAttribute('draggable','true');
        sec.classList.add('reorderable');

        if(!sec.querySelector(':scope > .reorder-bar')){
          const bar = document.createElement('div');
          bar.className = 'reorder-bar';
          bar.innerHTML = `
            <div class="reorder-handle" title="Drag to move">⋮⋮</div>
            <div class="reorder-title">${escapeHtml(sectionLabel(sec))}</div>
            <div class="reorder-actions">
              <button class="editor-btn" data-move="up" type="button" title="Move up">↑</button>
              <button class="editor-btn" data-move="down" type="button" title="Move down">↓</button>
            </div>
          `;
          sec.insertBefore(bar, sec.firstChild);
        }
      }else{
        sec.removeAttribute('draggable');
        sec.classList.remove('reorderable');
        const bar = sec.querySelector(':scope > .reorder-bar');
        if(bar) bar.remove();
      }
    });

    if(editorState.reorderOn){
      toast('Reorder mode: drag the handle or use ↑/↓', true);
    }

    // Drag + click handlers (delegated; installed once)
    if(!root.__reorderInstalled){
      root.__reorderInstalled = true;

      let dragEl = null;

      root.addEventListener('click', (e)=>{
        const btn = e.target.closest && e.target.closest('button[data-move]');
        if(!btn) return;
        if(!editorState.reorderOn) return;
        const sec = e.target.closest('section');
        if(!sec) return;
        e.preventDefault();
        move(sec, btn.getAttribute('data-move') === 'up' ? -1 : 1);
      });

      root.addEventListener('dragstart', (e)=>{
        if(!editorState.reorderOn) return;
        const sec = e.target.closest && e.target.closest('section');
        if(!sec) return;
        // Prefer dragging from the handle, but allow anywhere inside section.
        dragEl = sec;
        e.dataTransfer.effectAllowed = 'move';
        try{ e.dataTransfer.setData('text/plain','reorder'); }catch{}
      });

      root.addEventListener('dragover', (e)=>{
        if(!editorState.reorderOn) return;
        if(!dragEl) return;
        const over = e.target.closest && e.target.closest('section');
        if(!over || over===dragEl) return;
        e.preventDefault();
      });

      root.addEventListener('drop', (e)=>{
        if(!editorState.reorderOn) return;
        if(!dragEl) return;
        const over = e.target.closest && e.target.closest('section');
        if(!over || over===dragEl) return;
        e.preventDefault();
        const rect = over.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height/2;
        over.parentNode.insertBefore(dragEl, before ? over : over.nextSibling);
        log(`Dropped section: ${sectionLabel(dragEl)}`);
        dragEl = null;
        syncSource();
        toast('Reordered');
      });

      root.addEventListener('dragend', ()=>{
        dragEl = null;
      });
    }
  }

  async function showDiff(){
    const token = getToken();
    if(!token) throw new Error('Not logged in');
    const el = currentMdEl();
    if(!el) throw new Error('No content root');
    const mdPath = el.getAttribute('data-md');
    const target = document.getElementById('ecTarget')?.value || 'draft';
    const branch = target === 'publish' ? undefined : 'draft';
    const remote = await apiPost('/api/getfile', { token, path: mdPath, branch: branch || undefined });
    const local = (document.getElementById('ecSource')?.value) || '';
    const diffOut = document.getElementById('ecDiffOut');
    const a = remote.content.replace(/\r\n/g,'\n').split('\n');
    const b = local.replace(/\r\n/g,'\n').split('\n');
    const max = Math.max(a.length,b.length);
    let out = [];
    for(let i=0;i<max;i++){
      const x=a[i], y=b[i];
      if(x===y) continue;
      if(typeof x !== 'undefined') out.push(`- ${x}`);
      if(typeof y !== 'undefined') out.push(`+ ${y}`);
      if(out.length>300){ out.push('… (diff truncated)'); break; }
    }
    diffOut.textContent = out.join('\n') || 'No differences detected.';
    log(`Diff computed vs GitHub (${remote.branch})`);
  }

  async function uploadMedia(file, { mode } = {}){
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
      message: `Upload ${path} via site editor`,
      branch: mode === 'publish' ? undefined : 'draft'
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
        await login(pw.value || "");
        editorState.role = sessionStorage.getItem('editorRole') || 'editor';
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

    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishBtn = document.getElementById('publishBtn');
    const exitBtn = document.getElementById("exitEditBtn");
    const addProj = document.getElementById("addProjectBtn");
    const addRes = document.getElementById("addResearchBtn");
    const addNews = document.getElementById("addNewsBtn");
    const mediaFile = document.getElementById("mediaFile");
    const reorderBtn = document.getElementById('ecReorder');
    const diffBtn = document.getElementById('ecDiff');
    const closeConsoleBtn = document.getElementById('closeConsoleBtn');

    addProj && addProj.addEventListener("click", ()=> insertTemplate('project'));
    addRes && addRes.addEventListener("click", ()=> insertTemplate('research'));
    addNews && addNews.addEventListener("click", ()=> insertTemplate('news'));
    reorderBtn && reorderBtn.addEventListener('click', toggleReorder);
    diffBtn && diffBtn.addEventListener('click', ()=> showDiff().catch(e=>toast(e.message||'Diff failed', false)));
    closeConsoleBtn && closeConsoleBtn.addEventListener('click', ()=>{
      const c = document.getElementById('editorConsole');
      if(c) c.style.display='none';
    });

    exitBtn && exitBtn.addEventListener("click", () => {
      disableEditing();
    });

    saveDraftBtn && saveDraftBtn.addEventListener('click', async ()=>{
      saveDraftBtn.disabled = true;
      const prev = saveDraftBtn.textContent;
      saveDraftBtn.textContent = 'Saving...';
      try{
        await saveToGitHub({ mode: 'draft' });
        saveDraftBtn.textContent = 'Saved ✓';
        setTimeout(()=> saveDraftBtn.textContent = prev, 900);
      }catch(e){
        toast(e.message||'Save failed', false);
        saveDraftBtn.textContent = prev;
      }finally{ saveDraftBtn.disabled=false; }
    });

    publishBtn && publishBtn.addEventListener('click', async ()=>{
      if(editorState.role !== 'admin') return;
      publishBtn.disabled = true;
      const prev = publishBtn.textContent;
      publishBtn.textContent = 'Publishing...';
      try{
        await saveToGitHub({ mode: 'publish' });
        publishBtn.textContent = 'Published ✓';
        setTimeout(()=> publishBtn.textContent = prev, 1200);
      }catch(e){
        toast(e.message||'Publish failed', false);
        publishBtn.textContent = prev;
      }finally{ publishBtn.disabled=false; }
    });

    mediaFile && mediaFile.addEventListener("change", async () => {
      if(!mediaFile.files || !mediaFile.files[0]) return;
      try{
        const target = document.getElementById('ecTarget')?.value || 'draft';
        const isPublish = target === 'publish';
        const path = await uploadMedia(mediaFile.files[0], { mode: isPublish ? 'publish' : 'draft' });
        // insert markdown image at cursor
        const src = document.getElementById('ecSource');
        if(src){
          const ins = `\n\n![${mediaFile.files[0].name}](${path})\n`;
          const start = src.selectionStart || src.value.length;
          const end = src.selectionEnd || src.value.length;
          src.value = src.value.slice(0,start) + ins + src.value.slice(end);
          src.selectionStart = src.selectionEnd = start + ins.length;
          src.dispatchEvent(new Event('input'));
        }
        toast(`Uploaded ${path}`);
        log(`Uploaded media: ${path}`);
      }catch(e){
        toast(e.message || "Upload failed", false);
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
        editorState.role = sessionStorage.getItem('editorRole') || 'editor';
        enableEditing();
      }else{
        showModal();
      }
    });
  }
})();
