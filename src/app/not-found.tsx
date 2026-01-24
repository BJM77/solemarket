
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function NotFoundContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-t-4 border-destructive">
        <CardHeader className="p-8">
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-3xl font-bold font-headline">404 - Page Not Found</CardTitle>
          <CardDescription className="mt-2">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </CardDescription>
        </CardHeader>
        <CardFooter className="p-8 pt-0">
          <Button asChild className="w-full" size="lg">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function NotFound() {
  return <NotFoundContent />;
}
