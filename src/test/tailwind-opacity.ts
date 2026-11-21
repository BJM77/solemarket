/**
 * Effective text opacity implied by Tailwind classes on an element and its
 * ancestors (what a reader actually sees), for contrast tests on rendered DOM.
 *
 * Understands `opacity-NN` and `text-<token>/NN`, with `hover:` / `group-hover:` /
 * `focus:` variants overriding the base value in the hover state. Responsive
 * prefixes (md:, lg:) count too, and the worst case wins.
 */
export type TextState = 'base' | 'hover';

type Parsed = { kind: 'opacity' | 'text'; hover: boolean; value: number };

function parse(cls: string): Parsed | null {
  const parts = cls.split(':');
  const utility = parts.pop() || '';
  const variants = parts.filter((v) => !/^(sm|md|lg|xl|2xl|max-\w+|dark)$/.test(v));
  const hover = variants.some((v) => ['hover', 'group-hover', 'focus', 'focus-visible'].includes(v));
  if (variants.length && !hover) return null; // disabled:, aria-*: … aren't reading states
  let m = utility.match(/^opacity-(\d+)$/);
  if (m) return { kind: 'opacity', hover, value: Number(m[1]) / 100 };
  m = utility.match(/^text-[a-z-]+(?:-\d+)?\/(\d+)$/);
  if (m) return { kind: 'text', hover, value: Number(m[1]) / 100 };
  m = utility.match(/^text-[a-z-]+(?:-\d+)?\/\[([\d.]+)\]$/);
  if (m) return { kind: 'text', hover, value: Number(m[1]) };
  // A plain text colour on hover resets any faded text colour.
  if (hover && /^text-[a-z]+(?:-[a-z]+)*(?:-\d+)?$/.test(utility) && !/^text-(xs|sm|base|lg|xl|\d?xl|left|right|center|justify)$/.test(utility)) {
    return { kind: 'text', hover, value: 1 };
  }
  return null;
}

function elementOpacity(el: Element, state: TextState): number {
  const parsed = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).map(parse).filter((p): p is Parsed => !!p);
  const pick = (kind: Parsed['kind']) => {
    const base = parsed.filter((p) => p.kind === kind && !p.hover).map((p) => p.value);
    const hover = parsed.filter((p) => p.kind === kind && p.hover).map((p) => p.value);
    const values = state === 'hover' && hover.length ? hover : base;
    return values.length ? Math.min(...values) : 1;
  };
  return pick('opacity') * pick('text');
}

/** Opacity of `el`'s text after multiplying in every ancestor's opacity. */
export function effectiveTextOpacity(el: Element | null, state: TextState = 'base'): number {
  let total = 1;
  for (let node: Element | null = el; node; node = node.parentElement) total *= elementOpacity(node, state);
  return total;
}
