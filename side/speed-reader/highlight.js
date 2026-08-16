
document.addEventListener('DOMContentLoaded', ()=>{
  const preview = document.getElementById('preview');
  if(!preview) return;

  // create persistent highlight rectangle
  let box = document.getElementById('highlightBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'highlightBox';
    box.className = 'highlight-box';
    preview.appendChild(box);
  }

  const update = () => {
    const word = preview.querySelector('.word.highlight');
    if(!word) return;
    const wr = word.getBoundingClientRect();
    const pr = preview.getBoundingClientRect();
    const x = wr.left - pr.left;
    const y = wr.top - pr.top;
    box.style.transform = `translate(${x}px, ${y}px)`;
    box.style.width = wr.width + 'px';
    box.style.height = wr.height + 'px';
  };

  // observe class changes on preview
  const obs = new MutationObserver(update);
  obs.observe(preview, { attributes:true, subtree:true, attributeFilter:['class'] });

  // update on resize
  window.addEventListener('resize', update);

  // initial position
  requestAnimationFrame(update);

  // reload page after theme Apply / Reset so colors refresh everywhere
  ['themeApply','themeReset'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click', ()=>{
      // give the original handler time to save theme
      setTimeout(()=> window.location.reload(), 20);
    });
  });
});
