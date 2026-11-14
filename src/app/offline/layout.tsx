import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connection Lost',
  description: `It looks like you're offline. Please check your network connection and try again.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
