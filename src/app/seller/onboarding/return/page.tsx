'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyStripeAccountAction } from '@/app/actions/stripe';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StripeReturnPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your account details...');

    useEffect(() => {
        const verify = async () => {
            try {
                const idToken = await getCurrentUserIdToken();
                if (!idToken) {
                    setStatus('error');
                    setMessage('Authentication failed. Please log in.');
                    return;
                }

                const result = await verifyStripeAccountAction(idToken);

                if (result.success && result.isEnabled) {
                    setStatus('success');
                    setMessage('Your payout account has been successfully verified! You can now receive payments.');
                    // Redirect after a short delay
                    setTimeout(() => router.push('/seller/dashboard'), 3000);
                } else {
                    setStatus('error');
                    setMessage(result.message || 'Account verification pending or incomplete.');
                }
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message || 'An unexpected error occurred.');
            }
        };

        verify();
    }, [router]);

    return (
        <div className="container max-w-md mx-auto py-20 px-4">
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                        {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
                        {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
                    </div>
                    <CardTitle>
                        {status === 'loading' && 'Verifying...'}
                        {status === 'success' && 'You\'re All Set!'}
                        {status === 'error' && 'Verification Issue'}
                    </CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent>
                    {status !== 'loading' && (
                        <Button
                            onClick={() => router.push('/seller/dashboard')}
                            className="w-full"
                        >
                            Return to Dashboard
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
