export const reducedMotionQuery = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

export function isReducedMotion() {
  return reducedMotionQuery.matches || (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced');
}

export function routeFromPath(pathname = globalThis.location?.pathname || '/') {
  const slug = pathname.split('/').filter(Boolean)[0];
  return ['games', 'films', 'research', 'music', 'ai'].includes(slug) ? slug : 'home';
}

export function isCreativePath(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/' || ['/games', '/films', '/research', '/music', '/ai'].includes(normalized);
}

export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
