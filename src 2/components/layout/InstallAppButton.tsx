'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if prompt is already saved on window
    if (typeof window !== 'undefined') {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setIsVisible(true);
      }

      const handlePwaInstallable = () => {
        setDeferredPrompt(window.deferredPrompt);
        setIsVisible(true);
      };

      window.addEventListener('pwa-installable', handlePwaInstallable);

      // Hide button if app is installed
      window.addEventListener('appinstalled', () => {
        setIsVisible(false);
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      });

      return () => {
        window.removeEventListener('pwa-installable', handlePwaInstallable);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show native install dialog
    deferredPrompt.prompt();

    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User install response: ${outcome}`);

    // Clean up
    setDeferredPrompt(null);
    window.deferredPrompt = null;
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="hidden md:flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
      onClick={handleInstallClick}
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </Button>
  );
}
