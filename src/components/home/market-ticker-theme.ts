import { cn } from '@/lib/utils/ui';

/**
 * Surface styles for the main-site market ticker.
 *
 * Uses --primary and --primary-foreground so the bar follows the active
 * "Your team" theme (or Benched orange when no team is chosen). These are the
 * same tokens as the homepage primary buttons, with the same rounded-xl feel,
 * bold type and soft brand shadow. Team-theme changes apply live via CSS
 * variables, with no inline colour overrides that would flash the wrong colour.
 */
export const MARKET_TICKER_THEME_CLASSES = {
  background: 'bg-primary',
  foreground: 'text-primary-foreground',
  radius: 'rounded-xl',
  weight: 'font-bold',
  shadow: 'shadow-md shadow-primary/20',
  badge: 'bg-primary-foreground text-primary rounded-md font-bold',
  /** Waiting-state message: full-strength text (any fade drops some team themes below WCAG AA). */
  waitingText: 'text-primary-foreground',
  /** Ticker item hover: underline instead of fading the text colour (fading fails AA). */
  itemHover: 'hover:underline underline-offset-4',
} as const;

/** Text opacities used on the ticker surface; each must keep WCAG AA on every team theme. */
export const MARKET_TICKER_TEXT_OPACITIES = { waiting: 1, hover: 1 } as const;

export function marketTickerSurfaceClass({
  compact = false,
  waiting = false,
}: {
  compact?: boolean;
  waiting?: boolean;
} = {}): string {
  return cn(
    MARKET_TICKER_THEME_CLASSES.background,
    MARKET_TICKER_THEME_CLASSES.foreground,
    MARKET_TICKER_THEME_CLASSES.radius,
    MARKET_TICKER_THEME_CLASSES.weight,
    MARKET_TICKER_THEME_CLASSES.shadow,
    'overflow-hidden relative z-30 border border-primary',
    waiting && 'flex items-center justify-center gap-3',
    compact
      ? 'py-0 h-full w-full flex items-center'
      : 'py-1.5 md:py-2 mx-4 md:mx-6 my-1.5 md:my-2',
  );
}
