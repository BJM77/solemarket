import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All coins & bullion', href: '/coins/browse' },
      { label: 'Coins', href: '/coins/browse?coinType=coins' },
      { label: 'Bullion', href: '/coins/browse?coinType=bullion' },
      { label: 'Banknotes', href: '/coins/browse?subCategory=Banknotes' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'List a coin or bullion', href: '/coins/sell' },
      { label: 'Your listings', href: '/sell/listings' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'Safety tips', href: '/safety-tips' },
      { label: 'Contact', href: '/contact' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
];

export function CoinsFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-slate-950 text-slate-300" data-storefront-footer="coins">
      <div className="container mx-auto grid max-w-screen-2xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="text-lg font-black text-white">Benched <span className="text-amber-400">Coins</span></p>
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            Coins, bullion and banknotes from Australian collectors. Buyers pay sellers directly by PayID or cash on pickup.
          </p>
          <p className="mt-3 max-w-xs text-xs text-slate-500">
            Listings are written by sellers. Benched Coins does not grade, test or authenticate items, so check photos,
            grading slabs and the description, and message the seller before you buy.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="hover:text-amber-400">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Benched Coins, part of Benched (Australia).
      </div>
    </footer>
  );
}
