import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import ProductGrid from '@/components/products/ProductGrid';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import SectionPagination from '@/components/seo/SectionPagination';
import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { pageSlice, parsePageParam, sectionListings, sectionPagePath, SECTION_TITLES, totalPages, type ListingSection } from '@/lib/seo/section-pages';
import { pageOpenGraph } from '@/lib/seo/og';

async function resolve(section: ListingSection, raw: string) {
  const page = parsePageParam(raw);
  const listings = sectionListings(await getLiveListings(), section);
  const total = totalPages(listings.length);
  return { page, listings, total };
}

export async function sectionArchiveMetadata(section: ListingSection, raw: string): Promise<Metadata> {
  const { page, total } = await resolve(section, raw);
  if (!page || page > total) return { title: 'Not Found', robots: { index: false } };
  const title = `${SECTION_TITLES[section]} – Page ${page}`;
  const description = `Page ${page} of ${total} of live ${SECTION_TITLES[section].toLowerCase()} listings from Australian sellers on Benched, newest first.`;
  const path = sectionPagePath(section, page);
  return { title, description, alternates: { canonical: path }, openGraph: pageOpenGraph({ title, description, path }) };
}

export default async function SectionArchivePage({ section, raw }: { section: ListingSection; raw: string }) {
  if (raw === '1') permanentRedirect(`/${section}`);
  const { page, listings, total } = await resolve(section, raw);
  if (!page || page > total) notFound();
  const name = SECTION_TITLES[section];
  return (
    <div className="container mx-auto px-4 py-8">
      <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name, item: `/${section}` }, { name: `Page ${page}`, item: sectionPagePath(section, page) }]} />
      <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{name} <span className="text-muted-foreground">– Page {page}</span></h1>
      <p className="text-muted-foreground mt-2">Live listings from Australian sellers, newest first.</p>
      <ProductGrid products={pageSlice(listings, page)} priorityCount={2} />
      <SectionPagination section={section} page={page} total={total} />
    </div>
  );
}
