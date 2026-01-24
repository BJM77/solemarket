'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-rose-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Something went wrong!</h2>
          <p className="text-slate-500">
            We encountered an unexpected error. Our team has been notified.
          </p>
          {error.digest && (
            <div className="bg-slate-100 p-2 rounded text-xs font-mono text-slate-500 mt-2 break-all">
              Error ID: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button 
            onClick={() => reset()} 
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            asChild 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}