import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from './auth-provider';

export const metadata: Metadata = {
  title: 'Benched.au | ProCam Capture & Marketplace',
  description: 'The professional ecosystem for product photography, identification, and sales.',
};

export default function ProCamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
