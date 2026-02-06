'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { createSetupIntentAction } from '@/app/actions/payments';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({ amount, onSubmit, isSubmitting }: { amount: number, onSubmit: (paymentMethodId: string) => void, isSubmitting: boolean }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        // Trigger form validation and wallet collection
        const { error: submitError } = await elements.submit();
        if (submitError) {
            setMessage(submitError.message || "An error occurred");
            return;
        }

        // Create the SetupIntent first (binding the card)
        const { error, setupIntent } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/bidsy`, // Not strictly used for standard card flow often
            },
            redirect: 'if_required',
        });

        if (error) {
            setMessage(error.message || "Payment setup failed");
        } else if (setupIntent && setupIntent.status === 'succeeded') {
            // Pass the payment method ID (or just success signal) to the parent to save the offer
            // We technically verify the setupIntent on the server, but for now we just proceed.
            // Usually we want setupIntent.payment_method
            onSubmit(setupIntent.payment_method as string);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {message && <div className="text-red-500 text-sm">{message}</div>}
            <Button type="submit" disabled={!stripe || isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Submit Binding Offer (${amount})
            </Button>
        </form>
    );
}

export function BidsyOfferForm({ offerAmount, onOfferSubmit }: { offerAmount: number, onOfferSubmit: (paymentMethodId: string) => void }) {
    const [clientSecret, setClientSecret] = useState('');

    useEffect(() => {
        const init = async () => {
            const token = await getCurrentUserIdToken();
            if (token) {
                const res = await createSetupIntentAction(token);
                if (res.success && res.clientSecret) {
                    setClientSecret(res.clientSecret);
                }
            }
        };
        init();
    }, []);

    if (!clientSecret) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentForm amount={offerAmount} onSubmit={onOfferSubmit} isSubmitting={false} />
        </Elements>
    );
}
