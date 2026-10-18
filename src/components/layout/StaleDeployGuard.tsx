'use client';

import { useEffect } from 'react';
import { installStaleDeployHandler } from '@/lib/stale-deploy';

/** Installs the site-wide stale Server Action → reload listener once. */
export function StaleDeployGuard() {
  useEffect(() => {
    installStaleDeployHandler();
  }, []);
  return null;
}
