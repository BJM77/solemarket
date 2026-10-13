'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SiteConfig, DEFAULT_SITE_CONFIG, mergeSiteConfig, siteConfigCss } from '@/lib/types/site-config';

interface SiteConfigContextValue {
  config: SiteConfig;
  isLoading: boolean;
  /** True when an admin is previewing the unpublished draft (?sitePreview=draft). */
  isPreview: boolean;
  /** Live-edit preview inside the admin editor; never persisted. */
  updatePreviewConfig: (updated: Partial<SiteConfig>) => void;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: DEFAULT_SITE_CONFIG,
  isLoading: false,
  isPreview: false,
  updatePreviewConfig: () => {},
});

const PREVIEW_STYLE_ID = 'site-config-preview-vars';

function applyPreviewCss(config: SiteConfig | null) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!config) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('style');
    el.id = PREVIEW_STYLE_ID;
    document.head.appendChild(el);
  }
  // Same generator as SSR; higher specificity via body so it overrides the published vars.
  el.textContent = siteConfigCss(config).replace('html:root,html.dark', 'html:root:root,html.dark.dark');
}

/**
 * The published config is loaded on the server (cached, tag 'site-config') and passed in as
 * `initialConfig`, with its CSS variables already in the SSR <head>, so there is no flash of
 * defaults. Client-side we only subscribe to the draft when an admin opens a preview link.
 */
export function SiteConfigProvider({ children, initialConfig }: { children: React.ReactNode; initialConfig?: SiteConfig }) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig ?? DEFAULT_SITE_CONFIG);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;
    if (new URLSearchParams(window.location.search).get('sitePreview') !== 'draft') return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'site_config', 'draft'),
      (snap) => {
        if (snap.exists()) {
          const draft = mergeSiteConfig(snap.data() as Partial<SiteConfig>);
          setConfig(draft);
          applyPreviewCss(draft);
          setIsPreview(true);
        }
        setIsLoading(false);
      },
      (error) => {
        // Non-admins can't read drafts (rules); stay on the published config.
        console.warn('[SiteConfigProvider] draft preview unavailable:', error.message);
        setIsLoading(false);
      }
    );
    return () => { unsubscribe(); applyPreviewCss(null); };
  }, []);

  const updatePreviewConfig = (updated: Partial<SiteConfig>) => {
    setConfig((prev) => {
      const next = mergeSiteConfig({ ...prev, ...updated });
      applyPreviewCss(next);
      return next;
    });
  };

  return (
    <SiteConfigContext.Provider value={{ config, isLoading, isPreview, updatePreviewConfig }}>
      {isPreview && (
        <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-xl" data-testid="draft-preview-badge">
          Draft preview, not live
        </div>
      )}
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
