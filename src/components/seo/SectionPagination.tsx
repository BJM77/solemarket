import Link from 'next/link';
import { pageWindow, sectionPagePath, type ListingSection } from '@/lib/seo/section-pages';

/** Plain <a href> page links so crawlers can reach every listing (the grid's "Load more" is a button). */
export default function SectionPagination({ section, page, total }: { section: ListingSection; page: number; total: number }) {
  if (total <= 1) return null;
  const link = 'min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-full border text-sm font-semibold';
  return (
    <nav aria-label="Listing pages" className="container mx-auto px-4 mt-8 mb-4 flex flex-wrap items-center justify-center gap-2" data-testid="section-pagination">
      {page > 1 && (
        <Link href={sectionPagePath(section, page - 1)} rel="prev" className={`${link} border-border hover:bg-muted`}>Previous</Link>
      )}
      {pageWindow(page, total).map((n, i) => n === null ? (
        <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
      ) : n === page ? (
        <span key={n} aria-current="page" className={`${link} border-primary bg-primary text-primary-foreground`}>{n}</span>
      ) : (
        <Link key={n} href={sectionPagePath(section, n)} className={`${link} border-border hover:bg-muted`}>{n}</Link>
      ))}
      {page < total && (
        <Link href={sectionPagePath(section, page + 1)} rel="next" className={`${link} border-border hover:bg-muted`}>Next</Link>
      )}
    </nav>
  );
}
