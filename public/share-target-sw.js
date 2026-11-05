/*
 * Web Share Target handler, imported into the Workbox service worker
 * (vite.config.js → workbox.importScripts). Android's share sheet POSTs the
 * chosen photos to /share-receipt; this stores them in Cache Storage (pages
 * can't read a POST body after a redirect) and sends the app to the
 * Receipts page, which uploads them (src/utils/shareTarget.js).
 * Registered before Workbox's own fetch handler, so it answers first.
 */
const SHARE_CACHE_NAME = 'share-target';
const MAX_FILES = 10; // same limit as the upload endpoint

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/share-receipt') {
    return;
  }

  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const files = form.getAll('receipts')
        .filter((file) => file && typeof file !== 'string' && /^image\//.test(file.type))
        .slice(0, MAX_FILES);

      await caches.delete(SHARE_CACHE_NAME);
      const cache = await caches.open(SHARE_CACHE_NAME);
      await Promise.all(files.map((file, index) => cache.put(
        `/__shared-receipt/${index}`,
        new Response(file, {
          headers: {
            'Content-Type': file.type,
            'X-File-Name': encodeURIComponent(file.name || `shared-receipt-${index + 1}`)
          }
        })
      )));
    } catch (error) {
      // Fall through to the app; nothing to upload
      console.error('Share target failed', error);
    }
    return Response.redirect('/?share-target=1', 303);
  })());
});
