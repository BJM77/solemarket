import SectionPagination from '@/components/seo/SectionPagination';
import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { sectionListings, totalPages, type ListingSection } from '@/lib/seo/section-pages';

/** Page links under a section's first page (unfiltered view only). */
export default async function SectionPaginationServer({ section }: { section: ListingSection }) {
  const count = sectionListings(await getLiveListings(), section).length;
  return <SectionPagination section={section} page={1} total={totalPages(count)} />;
}
