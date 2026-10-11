# L5 - Native-quality mobile (PWA first, then Expo)

## Phase 1 - PWA (2-3 wk)
- Installable: manifest audit (icons 192/512 maskable, `display: standalone`, theme colours), install prompt after 2nd visit or first saved search.
- Offline: service worker (`public/sw.js`) via Workbox - cache app shell, `stale-while-revalidate` for browse JSON and product pages, offline page exists (`src/app/offline`).
- Push: FCM web push wired to notifications (saved-search matches, messages, order updates) with a preferences centre (`users/{uid}.notificationPrefs`).
- Camera: wizard already uses `capture="environment"`; add background upload queue (IndexedDB) that resumes after connectivity loss.
- Share target: "Share to Benched" from the photo gallery opens the wizard with images.

## Phase 2 - Expo app (8-12 wk, only if PWA metrics justify)
Shared TypeScript domain + API layer: move server actions used by mobile behind `/api/v1/*` route handlers with token auth; React Native screens for browse, product, wizard (native camera, multi-shot), messages, notifications. App Store needs: privacy labels, account deletion in-app, IAP rules (physical goods exempt).

## Metrics
Install rate, D30 retention installed vs web, listing completion on mobile, push opt-in.

## Open questions
Whether to require app for Tier 2 authentication photos (no).
