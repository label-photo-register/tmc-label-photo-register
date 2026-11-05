const VERSION='tmc-label-photo-v2.3-qr-first-row-ocr';
const SHELL=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon-32.png','./favicon.ico','./LabelPhotoZoom.bas','./Create_Shareable_Excel.vbs','./README_Shareable_Excel.txt','./V2.2.1_EXCEL_ZOOM_FIX.txt','./V2.2.2_EXCEL_ZOOM_FIX.txt'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tmc-label-photo-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  if(new URL(event.request.url).origin!==self.location.origin)return;
  // Network first helps GitHub Pages pick up new releases without hard-clearing browser data.
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    try{
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone()).catch(()=>{});
      return response;
    }catch(err){return (await caches.match(event.request))||Response.error();}
  })());
});
