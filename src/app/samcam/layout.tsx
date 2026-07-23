import type {Metadata} from 'next';
import { Toaster } from "@/samcam/components/ui/toaster"
import { AuthProvider } from './auth-provider';

export const metadata: Metadata = {
  title: 'Benched.au | Professional Card Capture & Marketplace',
  description: 'The professional ecosystem for trading card photography, identification, and sales.',
};

export default function SamCamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="samcam-container font-body antialiased min-h-screen">
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster />
    </div>
  );
}
