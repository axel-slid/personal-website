const cacheName='speed-reader-v6';
const files=['index.html','style.css','script.js','manifest.json','icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(cacheName).then(c=>c.addAll(files)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==cacheName).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
