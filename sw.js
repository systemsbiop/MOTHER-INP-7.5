/*
 MOTHER INP 7.5.0
 Minimal safe service worker.

 The application does not depend on this service worker.
*/

self.addEventListener("install", function(event) {

  self.skipWaiting();

});


self.addEventListener("activate", function(event) {

  event.waitUntil(
    self.clients.claim()
  );

});


self.addEventListener("fetch", function(event) {

  if (
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
  );

});
