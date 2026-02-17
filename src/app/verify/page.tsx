import VerificationForm from '@/components/auth/VerificationForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Identity Verification | Benched',
    description: 'Verify your identity to start buying and selling.',
};

export default function VerifyPage() {
    return (
        <div className="container py-10 min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Account Verification</h1>
                    <p className="text-muted-foreground">Complete this one-time step to unlock full access.</p>
                </div>

                <VerificationForm />
            </div>
        </div>
    );
}
