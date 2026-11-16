export const WORK_PATH = '/mahler/symphonie-2';

/** Normalize this work's entry URLs without adding a browser history entry. */
export function normalizeWorkLocation() {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if ((path === '/' && url.searchParams.get('catalog') !== '1') ||
      path === '/mahler/symphony-2' || path === WORK_PATH) {
    if (url.pathname !== WORK_PATH) {
      url.pathname = WORK_PATH;
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  }
}
