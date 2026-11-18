import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('document scroll behavior', () => {
  it('does not set CSS scroll-behavior on html/body (that breaks Next.js scroll-to-top)', () => {
    const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8');
    const block = css.slice(css.indexOf('html, body'), css.indexOf('img, svg, video'));
    expect(block).not.toMatch(/scroll-behavior\s*:\s*smooth/);
  });

  it('keeps data-scroll-behavior="smooth" on <html> so hash links can still smooth-scroll', () => {
    const layout = readFileSync(resolve(__dirname, '../../app/layout.tsx'), 'utf8');
    expect(layout).toContain('data-scroll-behavior="smooth"');
    // overflow-x-hidden on html/body creates a second scroll container so
    // window.scrollTo(0) may not move the page. Horizontal overflow is clipped in CSS instead.
    const htmlTag = layout.match(/<html[^>]*>/)?.[0] || '';
    const bodyTag = layout.match(/<body[^>]*>/)?.[0] || '';
    expect(htmlTag).not.toContain('overflow-x-hidden');
    expect(bodyTag).not.toContain('overflow-x-hidden');
  });
});
