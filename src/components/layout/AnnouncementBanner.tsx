import Link from 'next/link';
import { safeColor, type AnnouncementConfig } from '@/lib/types/site-config';

/** Site-wide announcement bar, rendered on the server from the published Brand Refresh config. */
export function AnnouncementBanner({ announcement }: { announcement: AnnouncementConfig }) {
  if (!announcement?.enabled || !announcement.text?.trim()) return null;
  const style = { backgroundColor: safeColor(announcement.bgColor) || '#2563eb', color: safeColor(announcement.textColor) || '#ffffff' };
  const href = announcement.href?.trim();
  const safeHref = href && (href.startsWith('/') || /^https:\/\//.test(href)) ? href : undefined;
  return (
    <div role="region" aria-label="Announcement" className="w-full px-4 py-2 text-center text-sm font-semibold" style={style} data-testid="announcement-banner">
      {safeHref ? <Link href={safeHref} className="underline-offset-4 hover:underline">{announcement.text}</Link> : announcement.text}
    </div>
  );
}
