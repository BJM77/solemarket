
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
       <Card className="w-full max-w-md p-6 shadow-xl border-t-4 border-primary h-fit text-center">
        <CardHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <ShieldAlert className="h-10 w-10 text-primary" />
            </div>
          <CardTitle className="text-2xl font-bold font-headline">Registration Is Closed</CardTitle>
          <CardDescription>
            To ensure a trusted marketplace, new accounts are created by administrators only. If you would like to become a seller, please contact support.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/sign-in">Return to Sign In</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
