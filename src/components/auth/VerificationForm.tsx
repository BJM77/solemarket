'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendEmailVerification } from 'firebase/auth';

export default function VerificationForm() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isSending, setIsSending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Effect for resend cooldown
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSendVerification = async () => {
        if (!auth?.currentUser) return;
        
        setIsSending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            toast({
                title: "Verification Email Sent",
                description: `A verification link has been sent to ${auth.currentUser.email}. Please check your inbox and spam folder.`,
            });
            setCooldown(60); // 60 seconds cooldown
        } catch (error: any) {
            console.error("Error sending verification email:", error);
            toast({
                variant: 'destructive',
                title: "Failed to send email",
                description: error.message || "Please try again later.",
            });
        } finally {
            setIsSending(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Sign In Required</CardTitle>
                    <CardDescription>Please sign in to verify your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push('/sign-in')}>Sign In</Button>
                </CardContent>
            </Card>
        );
    }

    if (user.emailVerified) {
        return (
            <div className="text-center p-8 bg-black/40 border border-white/10 rounded-2xl max-w-md mx-auto">
                <div className="bg-green-500/20 text-green-400 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Account Verified!</h2>
                <p className="text-gray-400 mb-6">Your email address has been verified. You can now buy and offer on all listings.</p>
                <Button className="w-full bg-white text-black hover:bg-gray-200" onClick={() => router.push('/browse')}>Start Browsing</Button>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto shadow-2xl bg-[#0A0A0A] border-white/10 text-white">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                <CardDescription className="text-gray-400">
                    We've sent a verification link to <span className="text-white font-medium">{user.email}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <Alert className="bg-indigo-500/5 border-indigo-500/20 text-indigo-200">
                    <AlertCircle className="h-4 w-4 text-indigo-400" />
                    <AlertTitle className="font-bold">Next Steps</AlertTitle>
                    <AlertDescription className="text-indigo-300/80">
                        Once you click the link in your email, refresh this page or click "Check Status" to unlock buying and offering.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    <Button 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-bold transition-all"
                        onClick={() => window.location.reload()}
                    >
                        Check Status & Refresh
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="w-full border-white/10 hover:bg-white/5 h-12 text-gray-300"
                        onClick={handleSendVerification}
                        disabled={isSending || cooldown > 0}
                    >
                        {isSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="mr-2 h-4 w-4" />
                        )}
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Email"}
                    </Button>
                </div>

                <p className="text-center text-xs text-gray-500 px-8">
                    Didn't receive the email? Check your spam folder or try resending.
                </p>
            </CardContent>
        </Card>
    );
}
