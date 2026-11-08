'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_STOREFRONT_ID,
  getStorefrontConfig,
  resolveStorefrontId,
  type StorefrontConfig,
} from '@/config/storefronts';

const StorefrontContext = createContext<StorefrontConfig>(getStorefrontConfig(DEFAULT_STOREFRONT_ID));

/**
 * Provides the active storefront. Resolved from the browser hostname after
 * hydration so static/ISR pages stay cacheable; server renders use the default.
 */
export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [storefront, setStorefront] = useState<StorefrontConfig>(() => getStorefrontConfig(DEFAULT_STOREFRONT_ID));
  useEffect(() => {
    const id = resolveStorefrontId(window.location.hostname);
    if (id !== DEFAULT_STOREFRONT_ID) setStorefront(getStorefrontConfig(id));
  }, []);
  return <StorefrontContext.Provider value={storefront}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontConfig {
  return useContext(StorefrontContext);
}
