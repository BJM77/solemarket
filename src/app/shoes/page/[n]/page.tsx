import type { Metadata } from 'next';
import SectionArchivePage, { sectionArchiveMetadata } from '@/components/seo/SectionArchivePage';

export const revalidate = 600;

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sectionArchiveMetadata('shoes', (await params).n);
}

export default async function Page({ params }: Props) {
  return <SectionArchivePage section="shoes" raw={(await params).n} />;
}
