export function registerSW() {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }
}
