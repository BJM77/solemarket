import { Metadata } from 'next';
import { SITE_NAME } from '@/config/brand';

export const metadata: Metadata = {
  title: `The Vault - Secure Collectibles Escrow | ${SITE_NAME}`,
  description: `Trade with peace of mind. The Vault acts as a secure middle-man to verify your products, secure payment in escrow, and handle insured shipping.`,
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
