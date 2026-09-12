'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real application, you would log the error to a service like Sentry,
    // LogRocket, or another error tracking service.
    console.error('Global Error Boundary Caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-lg">
            We apologize for the inconvenience. The application encountered an unexpected error. Our team has been notified.
          </p>
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
