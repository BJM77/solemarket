'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/ui';

export interface HoverMenuItem { label: string; href: string; icon?: React.ReactNode }

const OPEN_DELAY = 80;   // hover intent: ignore cursor passing over the trigger
const CLOSE_DELAY = 220; // grace period when moving diagonally towards the panel

/**
 * Desktop header dropdown that opens on hover (with intent delays) AND on click/tap/keyboard.
 * - The panel sits inside the same wrapper with a padding "bridge", so there is no
 *   dead gap between trigger and panel that closes the menu.
 * - Non-modal: no scroll lock, no body pointer-events:none, so moving to the next
 *   header item works immediately (Radix DropdownMenu was modal and click-only).
 * - Touch: hover is ignored for pointerType touch; tap toggles.
 * - Keyboard: Enter/Space/ArrowDown open and focus the first item; arrows move;
 *   Escape closes and returns focus; Tab out closes.
 */
export function HoverMenu({ label, items, className }: { label: string; items: HoverMenuItem[]; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const hoverOpened = React.useRef(false);

  const schedule = (next: boolean, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { hoverOpened.current = next; setOpen(next); }, delay);
  };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const focusItem = (idx: number) => {
    const links = panelRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
    if (!links?.length) return;
    links[(idx + links.length) % links.length].focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    } else if (e.key === 'Escape') setOpen(false);
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    const links = Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') || []);
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(links.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
  };

  return (
    <div
      className={cn('relative', className)}
      data-hover-menu=""
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') schedule(true, OPEN_DELAY); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') schedule(false, CLOSE_DELAY); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        data-state={open ? 'open' : 'closed'}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          // A mouse click right after hover-open should not slam the menu shut.
          if (open && hoverOpened.current) { hoverOpened.current = false; return; }
          hoverOpened.current = false;
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKey}
        className="group inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:text-primary"
      >
        {label}
        <ChevronDown aria-hidden className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </button>
      {/* pt-2 is the hover bridge: the panel's hit area starts flush with the trigger. */}
      <div
        className={cn(
          'absolute left-0 top-full z-[60] pt-2 transition-[opacity,transform] duration-150',
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0 pointer-events-none'
        )}
      >
        <div
          ref={panelRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKey}
          className="min-w-[220px] rounded-2xl border border-border/50 bg-background/95 p-2 shadow-2xl backdrop-blur-md"
        >
          {items.map((it) => (
            <Link
              key={it.href + it.label}
              href={it.href}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold uppercase tracking-widest outline-none transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary"
            >
              {it.icon}
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
