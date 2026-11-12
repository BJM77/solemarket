'use server';

import { getSystemSettingsAdmin } from '@/services/settings-service';
import type { ShippingSettings } from '@/lib/pricing';

/** Public, read-only shipping settings so the cart shows the same fee the server charges. */
export async function getShippingSettings(): Promise<ShippingSettings> {
    const s = await getSystemSettingsAdmin();
    return { freightCharge: Number(s.freightCharge) || 0, freeShippingThreshold: Number(s.freeShippingThreshold) || 0 };
}
