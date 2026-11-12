'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useUser } from '@/firebase';
import {
  TEAM_THEME_STORAGE_KEY, TEAM_THEME_VAR_KEYS, TEAM_THEME_VERSION,
  buildTeamThemeVars, isValidTeamChoice,
} from '@/lib/team-themes/theme';

interface TeamThemeContextValue {
  /** Current choice ("LAL", "LAL:alt") or null for the Benched default. */
  team: string | null;
  setTeam: (choice: string | null) => void;
}

const TeamThemeContext = createContext<TeamThemeContextValue>({ team: null, setTeam: () => {} });

export const useTeamTheme = () => useContext(TeamThemeContext);

function readStored(): string | null {
  try {
    const raw = localStorage.getItem(TEAM_THEME_STORAGE_KEY);
    if (!raw) return null;
    const k = JSON.parse(raw)?.k;
    return isValidTeamChoice(k) ? k : null;
  } catch {
    return null;
  }
}

/** Apply (or clear) the theme on <html> and cache it for the pre-paint boot script. */
function applyTheme(choice: string | null) {
  const root = document.documentElement;
  const vars = choice ? buildTeamThemeVars(choice) : null;
  for (const k of TEAM_THEME_VAR_KEYS) root.style.removeProperty(k);
  try {
    if (vars && choice) {
      for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
      root.setAttribute('data-team', choice);
      localStorage.setItem(TEAM_THEME_STORAGE_KEY, JSON.stringify({ k: choice, v: vars, ver: TEAM_THEME_VERSION }));
    } else {
      root.removeAttribute('data-team');
      localStorage.removeItem(TEAM_THEME_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable (private mode): theme still applies for this page view */
  }
}

async function idToken(): Promise<string | null> {
  const { getCurrentUserIdToken } = await import('@/lib/firebase/auth');
  return getCurrentUserIdToken();
}

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const uid = user?.uid ?? null;
  const [team, setTeamState] = useState<string | null>(null);
  const teamRef = useRef<string | null>(null);
  const syncedUid = useRef<string | null>(null);
  const pickedDuringSync = useRef(false);

  const setLocal = useCallback((choice: string | null) => {
    teamRef.current = choice;
    setTeamState(choice);
    applyTheme(choice);
  }, []);

  // Device preference first (the boot script already painted it; this refreshes cached vars).
  useEffect(() => {
    setLocal(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === TEAM_THEME_STORAGE_KEY) {
        const next = readStored();
        teamRef.current = next;
        setTeamState(next);
        applyTheme(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setLocal]);

  // On sign-in: the account's saved team wins; if the account has none, upload the device's.
  useEffect(() => {
    if (!uid) { syncedUid.current = null; return; }
    if (syncedUid.current === uid) return;
    syncedUid.current = uid;
    pickedDuringSync.current = false;
    let cancelled = false;
    (async () => {
      try {
        const token = await idToken();
        if (!token || cancelled) return;
        const { getFavoriteTeam, saveFavoriteTeam } = await import('@/app/actions/auth/team-theme');
        const res = await getFavoriteTeam(token);
        if (cancelled || !res.success || pickedDuringSync.current) return;
        if (res.choice) {
          if (res.choice !== teamRef.current) setLocal(res.choice);
        } else if (teamRef.current) {
          await saveFavoriteTeam(token, teamRef.current);
        }
      } catch {
        /* offline / not ready: device preference still applies */
      }
    })();
    return () => { cancelled = true; };
  }, [uid, setLocal]);

  const setTeam = useCallback((choice: string | null) => {
    const next = choice && isValidTeamChoice(choice) ? choice : null;
    pickedDuringSync.current = true;
    setLocal(next);
    if (uid) {
      (async () => {
        try {
          const token = await idToken();
          if (!token) return;
          const { saveFavoriteTeam } = await import('@/app/actions/auth/team-theme');
          await saveFavoriteTeam(token, next);
        } catch {
          /* saved on this device regardless */
        }
      })();
    }
  }, [uid, setLocal]);

  return <TeamThemeContext.Provider value={{ team, setTeam }}>{children}</TeamThemeContext.Provider>;
}
