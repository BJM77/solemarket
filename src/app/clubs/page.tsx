
import type { Metadata } from 'next';
import Link from 'next/link';
import { Store, Users, BadgeDollarSign, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getActiveClubs } from '@/app/actions/clubs';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Free Club & Stadium Pages',
  description: 'Basketball clubs and stadiums get their own free Benched marketplace page for members to buy and sell shoes, cards and more.',
  alternates: { canonical: '/clubs' },
};

const perks = [
  { icon: Store, title: 'Your own page', body: 'A dedicated club page on Benched showing only your club’s listings, with your name and logo.' },
  { icon: BadgeDollarSign, title: 'Free of charge', body: 'No setup cost, no monthly fee and 0% seller fees. Members keep what they sell for.' },
  { icon: Users, title: 'Reach more buyers', body: 'Your club is listed on the Benched home page, so shoppers across Australia can find you.' },
  { icon: ShieldCheck, title: 'Simple payments', body: 'Buyers pay by PayID or cash on pickup, the same as the rest of Benched.' },
];

export default async function ClubsPage() {
  const clubs = await getActiveClubs();
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">A free marketplace page for your club</h1>
          <p className="text-lg md:text-xl text-slate-600 mt-4 max-w-2xl">
            Basketball clubs and stadiums can run their own version of Benched, free. Your members list their shoes, cards and gear, and buyers shop your club’s page directly.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button asChild size="lg"><Link href="/contact">Get your free club page</Link></Button>
            {clubs.length > 0 && (
              <Button asChild size="lg" variant="outline"><a href="#clubs">Browse clubs</a></Button>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid sm:grid-cols-2 gap-6">
        {perks.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-slate-200 p-6">
            <Icon className="h-6 w-6 text-primary mb-3" />
            <h2 className="font-semibold text-slate-900 text-lg">{title}</h2>
            <p className="text-slate-600 mt-1">{body}</p>
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">How it works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
          <li>Contact us with your club or stadium name and logo.</li>
          <li>The Benched team creates your page and your stadium admin account, and links your club’s seller accounts.</li>
          <li>Your club appears on the Benched home page and gets its own link to share.</li>
          <li>Members list items as normal, and they show on your club page.</li>
        </ol>
      </section>

      {clubs.length > 0 && (
        <section id="clubs" className="bg-slate-50 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Clubs on Benched</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {clubs.map((c) => (
                <Link key={c.id} href={`/club/${c.slug}`} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-4 hover:border-primary">
                  {c.logoUrl && <img src={c.logoUrl} alt="" loading="lazy" className="h-10 w-10 object-contain" />}
                  <span className="font-semibold text-slate-900">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
