'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export function PwaRegister() {
  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA: ServiceWorker registration successful with scope: ', reg.scope);
          })
          .catch((err) => {
            console.error('PWA: ServiceWorker registration failed: ', err);
          });
      });
    }

    // Capture install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store event on window for InstallAppButton to access
      window.deferredPrompt = e;
      // Dispatch custom event to trigger visibility of any install UI
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  return null;
}
