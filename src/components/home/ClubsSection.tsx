
import Link from 'next/link';
import { getActiveClubs } from '@/app/actions/clubs';
import { Button } from '@/components/ui/button';

export default async function ClubsSection() {
  const clubs = await getActiveClubs();
  return (
    <section className="py-16 bg-slate-50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Clubs &amp; Stadiums</h2>
            <p className="text-slate-600 mt-1">Shop listings from your local basketball club.</p>
          </div>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5">
            <Link href="/clubs">Get a free club page</Link>
          </Button>
        </div>
        {clubs.length === 0 ? (
          <p className="text-slate-600">
            Run a club or stadium? Get your own free Benched page for your members&apos; listings.{' '}
            <Link href="/clubs" className="text-primary font-medium underline">Find out more</Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={`/club/${club.slug}`}
                className="group flex flex-col items-center text-center gap-3 rounded-xl bg-white border border-slate-200 p-4 hover:border-primary hover:shadow-sm transition"
              >
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt="" loading="lazy" className="h-14 w-14 object-contain" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {club.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-slate-900 group-hover:text-primary text-sm">{club.name}</span>
                {club.location && <span className="text-xs text-slate-500 -mt-2">{club.location}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
