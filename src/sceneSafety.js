// Browser observers are optional enhancements. Some embedded browsers expose
// them but throw during construction, so use simple fallbacks in that case.
export function observeSize(element, onResize) {
  let observer;
  try {
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(onResize);
      observer.observe(element);
      return () => observer.disconnect();
    }
  } catch { tryDispose(() => observer?.disconnect()); }
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

export function observeVisibility(element, onChange) {
  let observer;
  try {
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => { if (entries[0]) onChange(entries[0].isIntersecting); });
      observer.observe(element);
      return () => observer.disconnect();
    }
  } catch { tryDispose(() => observer?.disconnect()); }
  // Rendering while off-screen is safe, just less efficient.
  return () => {};
}

// Teardown must be safe even if initialization only partially completed, or
// the GPU has already lost its context.
export function tryDispose(callback) {
  try { callback?.(); } catch { /* Best-effort resource cleanup. */ }
}
