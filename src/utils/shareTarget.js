/**
 * Receipt photos shared to the installed app from another Android app
 * (Camera, Photos: Share → Grocery List). The service worker
 * (public/share-target-sw.js) stores the POSTed files in Cache Storage and
 * redirects to /?share-target=1; the Receipts page then picks them up here.
 */

export const SHARE_CACHE_NAME = 'share-target';
export const SHARE_PARAM = 'share-target';

/** @returns {boolean} whether this page load came from a share */
export const isShareLaunch = (search = globalThis.location?.search || '') => (
  new globalThis.URLSearchParams(search).has(SHARE_PARAM)
);

/** Drop the share marker from the URL (keeps reloads from re-uploading) */
export const clearShareParam = () => {
  const url = new URL(globalThis.location.href);
  if (!url.searchParams.has(SHARE_PARAM)) { return; }
  url.searchParams.delete(SHARE_PARAM);
  globalThis.history.replaceState(globalThis.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

/**
 * Read and remove the shared files, in the order they were shared.
 * @returns {Promise<File[]>}
 */
export const takeSharedFiles = async () => {
  const cacheStorage = globalThis.caches;
  if (!cacheStorage) { return []; }
  const cache = await cacheStorage.open(SHARE_CACHE_NAME);
  const requests = await cache.keys();
  const ordered = [...requests].sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true }));
  const files = [];
  for (const request of ordered) {
    const response = await cache.match(request);
    if (!response) { continue; }
    const blob = await response.blob();
    const name = decodeURIComponent(response.headers.get('X-File-Name') || `shared-receipt-${files.length + 1}`);
    files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }));
  }
  await cacheStorage.delete(SHARE_CACHE_NAME);
  return files;
};
