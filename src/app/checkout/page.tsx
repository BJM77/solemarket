'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Checkout is disabled in the P2P direct communication model.
    // Redirect users back to the home page if they somehow navigate here.
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#020617]">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Redirecting...</p>
      </div>
    </div>
  );
}
