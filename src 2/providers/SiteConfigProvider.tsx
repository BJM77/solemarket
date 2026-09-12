'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SiteConfig, DEFAULT_SITE_CONFIG } from '@/lib/types/site-config';
import { saveSiteConfig } from '@/services/site-config-service';

interface SiteConfigContextValue {
  config: SiteConfig;
  isLoading: boolean;
  saveConfig: (newConfig: SiteConfig) => Promise<boolean>;
  updatePreviewConfig: (updated: Partial<SiteConfig>) => void;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: DEFAULT_SITE_CONFIG,
  isLoading: true,
  saveConfig: async () => false,
  updatePreviewConfig: () => {},
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to real-time config updates from Firestore
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'site_config', 'current');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SiteConfig;
           setConfig({
            branding: { ...DEFAULT_SITE_CONFIG.branding, ...(data.branding || {}) },
            hero: { ...DEFAULT_SITE_CONFIG.hero, ...(data.hero || {}) },
            sections: data.sections || DEFAULT_SITE_CONFIG.sections,
            menus: data.menus || DEFAULT_SITE_CONFIG.menus,
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('[SiteConfigProvider] Firestore config subscription fallback:', error.message);
        setConfig(DEFAULT_SITE_CONFIG);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Dynamically inject CSS variables onto document root whenever branding changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const { primaryColor, buttonColor, buttonTextColor, tickerBgColor, tickerTextColor } = config.branding;

    // Apply primary color if given (HSL or Hex)
    if (primaryColor) {
      root.style.setProperty('--primary', primaryColor);
      root.style.setProperty('--ring', primaryColor);
      root.style.setProperty('--accent', primaryColor);
    }

    if (buttonColor) {
      root.style.setProperty('--btn-primary-bg', buttonColor);
    }
    if (buttonTextColor) {
      root.style.setProperty('--btn-primary-text', buttonTextColor);
    }

    if (tickerBgColor) {
      root.style.setProperty('--ticker-bg', tickerBgColor);
    }
    if (tickerTextColor) {
      root.style.setProperty('--ticker-text', tickerTextColor);
    }
  }, [config.branding]);

  const updatePreviewConfig = (updated: Partial<SiteConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...updated,
      branding: { ...prev.branding, ...(updated.branding || {}) },
      hero: { ...prev.hero, ...(updated.hero || {}) },
      sections: updated.sections || prev.sections,
    }));
  };

  const handleSaveConfig = async (newConfig: SiteConfig) => {
    const success = await saveSiteConfig(newConfig);
    if (success) {
      setConfig(newConfig);
    }
    return success;
  };

  return (
    <SiteConfigContext.Provider
      value={{
        config,
        isLoading,
        saveConfig: handleSaveConfig,
        updatePreviewConfig,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
