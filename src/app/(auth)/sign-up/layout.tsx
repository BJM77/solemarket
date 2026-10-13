import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Join Benched to buy and sell sneakers, collector cards and coins across Australia.',
  robots: { index: false, follow: true },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
