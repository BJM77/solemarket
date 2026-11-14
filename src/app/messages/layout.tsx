import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import MessagesAuthGate from './MessagesAuthGate';

// Private inbox: never indexed.
export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false },
};

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return <MessagesAuthGate>{children}</MessagesAuthGate>;
}
