import { useEffect, useState } from 'react';

// Offline support belongs to the production build. Development assets and HMR
// must never be cached by the production service worker.
export function useOffline() {
  const [state, setState] = useState(import.meta.env.PROD ? 'preparing' : 'development');
  const [online, setOnline] = useState(() => navigator.onLine !== false);

  useEffect(() => {
    let disposed = false;
    let checkSequence = 0;
    let verify = () => {};
    const cleanups = [];
    const pendingChecks = new Set();
    const change = (value) => { if (!disposed) setState(value); };
    const updateNetwork = () => { setOnline(navigator.onLine !== false); verify(); };
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    if (import.meta.env.PROD) {
      let serviceWorker;
      try { serviceWorker = navigator.serviceWorker; } catch { /* Browser policy may block access. */ }
      if (!serviceWorker || typeof serviceWorker.register !== 'function' || !window.isSecureContext) {
        change('unavailable');
      } else {
        try {
          Promise.resolve(serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })).then((registration) => {
            if (disposed) return;
            verify = () => {
              const worker = registration.active;
              if (!worker || worker.state !== 'activated') return;
              const sequence = ++checkSequence;
              try {
                const channel = new MessageChannel();
                const cancel = () => { window.clearTimeout(timer); channel.port1.close(); pendingChecks.delete(cancel); };
                const finish = (ready) => {
                  cancel();
                  if (disposed || sequence !== checkSequence) return;
                  change(ready ? (registration.waiting ? 'update' : 'ready') : 'unavailable');
                };
                const timer = window.setTimeout(() => finish(false), 20_000);
                pendingChecks.add(cancel);
                channel.port1.onmessage = (event) => finish(event.data?.ready === true);
                worker.postMessage({ type: 'CHECK_OFFLINE_CACHE', repair: navigator.onLine !== false }, [channel.port2]);
              } catch { change('unavailable'); }
            };
            const watch = (worker) => {
              if (!worker) return;
              const stateChanged = () => {
                if (worker.state === 'redundant' && !registration.active) change('unavailable');
                else verify();
              };
              worker.addEventListener('statechange', stateChanged);
              cleanups.push(() => worker.removeEventListener('statechange', stateChanged));
              stateChanged();
            };
            const updateFound = () => watch(registration.installing);
            registration.addEventListener('updatefound', updateFound);
            cleanups.push(() => registration.removeEventListener('updatefound', updateFound));
            watch(registration.installing);
            watch(registration.waiting);
            watch(registration.active);
            verify();
            serviceWorker.ready?.then(() => verify()).catch(() => {});
          }).catch(() => change('unavailable'));
        } catch { change('unavailable'); }
      }
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      cleanups.forEach((cleanup) => cleanup());
      pendingChecks.forEach((cancel) => cancel());
    };
  }, []);

  return { state, online };
}
