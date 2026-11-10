// Minimal service worker so InvoicePro can be installed as an app.
// Requests go straight to the network; nothing is cached, so invoices and
// other account data are never served stale.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through: let the browser handle the request normally.
});
