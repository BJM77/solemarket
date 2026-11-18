import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListingDetailsFallback } from './ListingDetailsFallback';

describe('ListingDetailsFallback', () => {
  it('shows the listing photo and title so first navigation is not a blank spinner', () => {
    render(
      <ListingDetailsFallback
        product={{
          id: 'abc',
          title: 'Jordan Air Jordan 1 Retro High OG',
          price: 180,
          category: 'Sneakers',
          imageUrls: ['https://example.com/jordan-1.jpg'],
        } as any}
      />,
    );
    expect(screen.getByRole('heading', { name: /Jordan Air Jordan 1 Retro High OG/i })).toBeInTheDocument();
    const img = screen.getByRole('img', { name: /Jordan Air Jordan 1 Retro High OG/i });
    expect(img.getAttribute('src') || '').toContain('jordan-1.jpg');
  });
});
