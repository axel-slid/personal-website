
/* Speed Reader – constant line flow */
const WORDS_PER_LINE = 10;

let words = [];
let current = 0;
let isPlaying = false;
let timerId = null;
let bookmarks = [];
let bookmarkDots = []; // timeline dots

let lastLineIdx = -1;

const flashEl = () => document.getElementById('flashWord');
const previewEl = () => document.getElementById('preview');
const progressBar = () => document.getElementById('progressBar');
const statsEl = () => document.getElementById('stats');

/* ---------- PREP ---------- */
function prepareText(){
// Reset bookmarks and timeline dots
bookmarks.length = 0;
bookmarkDots.forEach(dot => dot.remove());
bookmarkDots.length = 0;

  const raw = document.getElementById('textArea').value.trim();
  if(!raw){ alert('Paste some text first!'); return; }

  // Title detection (first line <=20 words)
  const firstLine = raw.split(/\r?\n/)[0].trim();
  document.getElementById('title').textContent =
      firstLine && firstLine.split(' ').length <= 20 ? firstLine : '';

  words = raw.replace(/\s+/g, ' ').split(' ');
  current = 0;

  // Initial render
  renderPreview(true);
  updateStats();
  updateProgress();

  switchTab('reader');
}

/* ---------- PLAYBACK ---------- */
function togglePlayPause(){
  if(isPlaying){ pauseReading(); return; }
  if(current >= words.length) current = 0;
  isPlaying = true;
  document.getElementById('playPauseBtn').textContent = 'Pause';
  scheduleNextWord(0);
}
function pauseReading(){
  if(timerId) clearTimeout(timerId);
  timerId = null;
  isPlaying = false;
  document.getElementById('playPauseBtn').textContent = 'Play';
}
function resetReading(){
  pauseReading();
  current = 0;
  renderPreview(true);
  updateProgress();
}

/* ---------- WORD TIMING ---------- */
function scheduleNextWord(delay){
  timerId = setTimeout(()=>{
     if(!isPlaying || current >= words.length){
       pauseReading();
       return;
     }
     current++;
     renderPreview();
     updateProgress();
     updateStats();
     const wpm = parseInt(document.getElementById('speedSelect').value);
     const base = 60000 / wpm;
     const factor = 0.6 + (words[current] ? words[current].length / 12 : 0);
     scheduleNextWord(base * factor);
  }, delay);
}

/* ---------- RENDER ---------- */


function renderPreview(force=false){
  flashEl().textContent = words[current] || '';

  const lineIdx = Math.floor(current / WORDS_PER_LINE);

  // If we have changed line (or force), rebuild preview with 5-line window
  if(force || lineIdx !== lastLineIdx){
     const linesHtml = [];
     const startIdx = Math.max(0, lineIdx - 3);     // show up to 3 lines above
     const endIdx   = lineIdx + 1;                  // current + incoming (total 5 max)
     for(let li = startIdx; li <= endIdx; li++){
        if(li * WORDS_PER_LINE >= words.length) continue;
        const startWord = li * WORDS_PER_LINE;
        const slice = words.slice(startWord, startWord + WORDS_PER_LINE);
        const lineWords = slice.map((w, wIdx)=>{
           const gIdx = startWord + wIdx;
           const classes = ['word'];
           if(li === lineIdx && gIdx === current) classes.push('highlight');
           if(bookmarks.includes(gIdx))          classes.push('bookmark-word');
           return `<span class="${classes.join(' ')}" data-idx="${gIdx}">${w}</span>`;
        }).join(' ');
        const lineClass = (li === endIdx) ? 'line new' : 'line';
        linesHtml.push(`<div class="${lineClass}" data-line="${li}">${lineWords}</div>`);
     }
     previewEl().innerHTML = linesHtml.join('');
     lastLineIdx = lineIdx;
  } else {
     // Same line: just move highlight
     const prev = previewEl().querySelector('.word.highlight');
     if(prev) prev.classList.remove('highlight');
     const newSpan = previewEl().querySelector(`span[data-idx='${current}']`);
     if(newSpan) newSpan.classList.add('highlight');
  }
}



/* ---------- STATS & PROGRESS ---------- */
function updateStats(){
  if(!words.length){ statsEl().textContent=''; return; }
  const wpm = parseInt(document.getElementById('speedSelect').value);
  const totalSec = words.length / wpm * 60;
  const elapsedSec = current / wpm * 60;
  const remain = Math.max(0, totalSec - elapsedSec);
  const fmt = s => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
};
    statsEl().textContent = `${current}/${words.length} • ${wpm} wpm • est. ${fmt(remain)} left`;
}

function updateProgress(){
  if(!words.length){ progressBar().style.width='0%'; return; }
  progressBar().style.width = (current / words.length * 100) + '%';
}

/* ---------- PROGRESS BAR CLICK ---------- */
document.getElementById('progressContainer').addEventListener('click', e=>{
  if(!words.length) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  current = Math.min(words.length-1, Math.floor(words.length * pct));
  renderPreview(true);
  updateProgress();
  updateStats();
  pauseReading();
});

/* ---------- BOOKMARKS ---------- */
function addBookmark(){
  if(!words.length) return;
  bookmarks.push(current);
  renderBookmarks();
}
function renderBookmarks(){
  const list = document.getElementById('bookmarkList');
  list.innerHTML='';
  bookmarks.forEach((idx,i)=>{
     const btn=document.createElement('button');
     btn.className='bookmark';
     btn.textContent='🔖 '+(i+1);
     btn.onclick=()=>{ current = idx; renderPreview(true); updateProgress(); updateStats(); pauseReading(); };
     list.appendChild(btn);
  });
}

/* ---------- TAB NAV ---------- */
function switchTab(t){
  ['loader','reader','library'].forEach(id=>{
    document.getElementById(id).classList.toggle('active', id===t);
  });
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  if(t==='loader') document.getElementById('uploadTabBtn').classList.add('active');
  if(t==='reader') document.getElementById('readerTabBtn').classList.add('active');

}


/* ---------- PDF PARSING ---------- */
/**
 * Extracts all visible text from an OCR'd PDF using pdf.js
 * @param {File} file - The PDF file chosen or pasted by the user
 * @returns {Promise<string>} - Resolves with concatenated text of the PDF
 */
async function parsePDF(file){
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data:arrayBuffer}).promise;
  let fullText = '';
  for(let pageNum=1; pageNum<=pdf.numPages; pageNum++){
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(it=>it.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

/* ---------- CLIPBOARD SUPPORT ---------- */
// Allow users to simply paste a PDF file (e.g. Cmd/Ctrl+V from Finder/Explorer)
document.addEventListener('paste', async e=>{
  for(const item of e.clipboardData.files){
     if(item.type==='application/pdf'){
       try{
         const txt = await parsePDF(item);
         document.getElementById('textArea').value = txt;
         alert('PDF pasted and parsed! Click "Start" to begin.');
       }catch(err){
         console.error(err);
         alert('Failed to parse PDF. Make sure it is text‑based / OCR‑ed.');
       }
       return;
     }
  }
});


/* ---------- FILE INPUT ---------- */
document.getElementById('fileInput').addEventListener('change', async e=>{
  const file=e.target.files[0];
  if(!file) return;
  if(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
    try{
      const txt = await parsePDF(file);
      document.getElementById('textArea').value = txt;
    }catch(err){
      console.error(err);
      alert('Failed to parse PDF. Make sure it is text-based / OCR-ed.');
    }
    return;
  }
  const fr=new FileReader();
  fr.onload = evt => { document.getElementById('textArea').value = evt.target.result; };
  fr.readAsText(file);
});


/* ---------- LIBRARY ---------- */
const LIB_KEY = 'speedReaderLibrary';

function getLibrary(){
  try{
    return JSON.parse(localStorage.getItem(LIB_KEY)) || [];
  }catch(e){ return []; }
}

function saveLibrary(arr){
  localStorage.setItem(LIB_KEY, JSON.stringify(arr));
}

// Render library grid

function renderLibrary(){
  const grid = document.getElementById('libraryGrid');
  grid.innerHTML = '';
  const lib = getLibrary();
  lib.forEach((book, idx)=>{
     const card = document.createElement('div');
     card.className = 'book-card';
     card.ondblclick = () => { loadBook(idx); };

     const img = document.createElement('img');
     img.src = book.cover || 'https://dummyimage.com/400x600/4b4d5c/ffffff&text=No+Cover';
     card.appendChild(img);

     const title = document.createElement('h3');
     title.textContent = book.title || ('Book '+(idx+1));
     card.appendChild(title);

     const actions = document.createElement('div');
     actions.className = 'book-actions';

     const loadBtn = document.createElement('button');
     loadBtn.textContent = 'Load';
     loadBtn.onclick = () => { loadBook(idx); };
     actions.appendChild(loadBtn);

     const delBtn = document.createElement('button');
     delBtn.textContent = '🗑️';
     delBtn.title = 'Delete';
     delBtn.onclick = () => {
         if(confirm('Delete this book?')){
            deleteBook(idx);
         }
     };
     actions.appendChild(delBtn);

     card.appendChild(actions);
     grid.appendChild(card);
  });
}


// Save current book
function saveCurrentToLibrary(){
  if(!words.length){ alert('Load text first!'); return; }
  const title = prompt('Book title?') || 'Untitled';
  const cover = prompt('Cover image URL (optional):');
  const lib = getLibrary();
  lib.push({ title, cover, content: words.join(' ') });
  saveLibrary(lib);
  alert('Saved to library!');
  renderLibrary();
}

// Load book by index
function loadBook(idx){
  const lib = getLibrary();
  if(idx<0 || idx>=lib.length){ return; }
  const book = lib[idx];
  document.getElementById('textArea').value = book.content;
  switchTab('loader');
  alert('Book loaded! Click "Start" to begin.');
}


/* Remove a book from the saved library by its index */
function deleteBook(idx){
  const lib = getLibrary();
  if(idx < 0 || idx >= lib.length) return;
  lib.splice(idx, 1);
  saveLibrary(lib);
  renderLibrary();
}


/* ---------- UPLOAD BUTTONS ---------- */
document.getElementById('uploadPdfBtn').addEventListener('click', ()=>{
  const fi = document.getElementById('fileInput');
  fi.accept = '.pdf';
  fi.value = '';
  fi.click();
});
document.getElementById('uploadTxtBtn').addEventListener('click', ()=>{
  const fi = document.getElementById('fileInput');
  fi.accept = '.txt,.text';
  fi.value = '';
  fi.click();
});

/* ---------- NEW: keyboard speed control & preview dbl-click ---------- */
document.addEventListener('keydown', e=>{
  if(!document.getElementById('reader').classList.contains('active')) return;
  if(e.key!=='ArrowUp' && e.key!=='ArrowDown') return;
  e.preventDefault();
  const sel = document.getElementById('speedSelect');
  let wpm = parseInt(sel.value,10) || 300;
  wpm += (e.key==='ArrowUp') ? 10 : -10;
  wpm = Math.max(10, wpm);
  /* ensure the select has this option, or add dynamically */
  if(!sel.querySelector(`option[value="${wpm}"]`)){
      const opt=document.createElement('option');
      opt.value=opt.textContent=wpm;
      sel.appendChild(opt);
  }
  sel.value = String(wpm);
  updateStats();
  if(isPlaying){
    clearTimeout(timerId);
    scheduleNextWord(0);          /* apply change immediately */
  }
});

previewEl().addEventListener('dblclick', e=>{
  const span = e.target.closest('span[data-idx]');
  if(!span) return;
  current = parseInt(span.dataset.idx,10);
  renderPreview(true);
  updateProgress();
  updateStats();
  pauseReading();
});



/* ---------- BOOKMARK DOTS ON PROGRESS BAR ---------- */
const progressContainer = document.getElementById('progressContainer'); // wrapper

function addTimelineDot(idx){
  if(!progressContainer) return;
  // avoid duplicate dots for same idx
  if(bookmarkDots.some(d=>+d.dataset.idx === idx)) return;
  const dot = document.createElement('div');
  dot.className = 'progress-dot';
  dot.dataset.idx = idx;
  dot.title = 'Jump to bookmark';
  dot.onclick = () => {
    current = idx;
    renderPreview(true);
    updateProgress();
    updateStats();
    pauseReading();
  };
  progressContainer.appendChild(dot);
  bookmarkDots.push(dot);
  positionDot(dot, idx);
}

function removeTimelineDot(idx){
  const i = bookmarkDots.findIndex(d=>+d.dataset.idx === idx);
  if(i > -1){
    bookmarkDots[i].remove();
    bookmarkDots.splice(i, 1);
  }
}

function positionDot(dot, idx){
  if(!words.length) return;
  const pct = (idx / (words.length - 1)) * 100;
  dot.style.left = pct + '%';
}

/* keep dots positioned on resize */

/* right‑click a progress dot to delete bookmark */
progressContainer?.addEventListener('contextmenu', e=>{
  const dot=e.target.closest('.progress-dot');
  if(!dot) return;
  e.preventDefault();
  const idx=+dot.dataset.idx;
  removeTimelineDot(idx);
  const p=bookmarks.indexOf(idx);
  if(p>-1) bookmarks.splice(p,1);
  renderPreview(true);
  updateProgress();
});

window.addEventListener('resize', () => {
  bookmarkDots.forEach(dot => positionDot(dot, +dot.dataset.idx));
});

/* ---------- override addBookmark to include dot ---------- */
function addBookmark(){
  if(!words.length) return;
  bookmarks.push(current);
  addTimelineDot(current);
  renderBookmarks();
}

/* ---------- override updateProgress to move dots ---------- */
function updateProgress(){
  if(!words.length){ progressBar().style.width='0%'; return; }
  progressBar().style.width = (current / words.length * 100) + '%';
  bookmarkDots.forEach(dot => positionDot(dot, +dot.dataset.idx));
}

/* ---------- override saveCurrentToLibrary with confirmation ---------- */
function saveCurrentToLibrary(){
  if(!words.length){ alert('Load text first!'); return; }
  if(!confirm('Save this text to your library?')){
    alert('Save canceled');
    return;
  }
  const title = prompt('Book title?') || 'Untitled';
  const cover = prompt('Cover image URL (optional):');
  const lib = getLibrary();
  lib.push({ title, cover, content: words.join(' ') });
  saveLibrary(lib);
  alert('Saved to library!');
  renderLibrary();
}





/* ---------------- THEME SUPPORT ---------------- */
const THEME_KEY = 'speedreader_theme_v2';
const THEME_DEFAULT = {bg:'#1e1e26', text:'#e0e0e0', accent:'#ffd54f'};

function applyTheme(t=null){
  const theme = {...THEME_DEFAULT, ...(t || JSON.parse(localStorage.getItem(THEME_KEY)||'{}'))};
  Object.entries(theme).forEach(([k,v])=>{
    document.documentElement.style.setProperty(`--${k}`, v);
  });
  // update pickers if they exist
  ['bg','text','accent'].forEach(id=>{
    const inp = document.getElementById(id+'Color');
    if(inp) inp.value = theme[id];
  });
}

applyTheme();

// Theme page interactions
document.getElementById('themeApply')?.addEventListener('click', ()=>{
  const theme = {
    bg: document.getElementById('bgColor').value,
    text: document.getElementById('textColor').value,
    accent: document.getElementById('accentColor').value
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  applyTheme(theme);
  renderPreview(true);
  updateProgress();
  updateStats();
});

document.getElementById('themeReset')?.addEventListener('click', ()=>{
  localStorage.removeItem(THEME_KEY);
  applyTheme(THEME_DEFAULT);
  renderPreview(true);
  updateProgress();
  updateStats();
});
