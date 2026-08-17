const lanternTraceEmbedMode = new URLSearchParams(window.location.search).get('embed');
if (lanternTraceEmbedMode === 'hero') {
  document.documentElement.classList.add('physics-embed', 'hero-map-embed');
}
