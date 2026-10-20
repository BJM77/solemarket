'use client';
import { useEffect, useState } from 'react';
import { getTierSettings } from '@/app/actions/marketplace/tier-actions';
import { DEFAULT_TIER_SETTINGS, type TierSettings } from '@/lib/tier-bundles';

let cache: TierSettings | null = null;
let inflight: Promise<TierSettings> | null = null;

/** Admin Bronze/Silver/Gold settings, fetched once per page load. */
export function useTierSettings(): TierSettings {
    const [s, setS] = useState<TierSettings>(cache ?? DEFAULT_TIER_SETTINGS);
    useEffect(() => {
        if (cache) { setS(cache); return; }
        let alive = true;
        inflight = inflight ?? getTierSettings().then(r => (cache = r)).catch(() => DEFAULT_TIER_SETTINGS);
        inflight.then(r => { if (alive) setS(r); });
        return () => { alive = false; };
    }, []);
    return s;
}

export function setTierSettingsCache(s: TierSettings) { cache = s; }
