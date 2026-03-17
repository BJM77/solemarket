"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Mail } from "lucide-react";
import { sendGuestEnquiry } from "@/app/actions/enquiry-actions";
import { sendActionVerificationEmail } from "@/app/actions/email-verification";
import { useEffect } from "react";
import { trackEcommerceEvent } from "@/lib/analytics";

interface GuestMessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sellerId: string;
    productId: string;
    productTitle: string;
}

export function GuestMessageDialog({ isOpen, onClose, sellerId, productId, productTitle }: GuestMessageDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [step, setStep] = useState<'details' | 'verify'>('details');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [message, setMessage] = useState("");

    // Load persisted guest data
    useEffect(() => {
        if (isOpen) {
            const savedEmail = localStorage.getItem('guest_email');
            const savedCode = localStorage.getItem('guest_code');
            const savedName = localStorage.getItem('guest_name');
            if (savedEmail) setEmail(savedEmail);
            if (savedCode) {
                setVerificationCode(savedCode);
                setStep('verify');
            }
            if (savedName) setName(savedName);
            
            // Set a better default message than the generic one
            setMessage(`Hi, I saw your ${productTitle} and wanted to ask...`);
        }
    }, [isOpen, productTitle]);

    const handleSendCode = async () => {
        if (!email || !email.includes('@')) {
            toast({ title: "Email required", variant: "destructive" });
            return;
        }
        setIsSendingCode(true);
        try {
            const result = await sendActionVerificationEmail(email);
            if (result.success) {
                setStep('verify');
                toast({ title: "Code Sent", description: "Please check your email for the verification code." });
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (step === 'details') {
            await handleSendCode();
            return;
        }

        if (!verificationCode) {
            toast({ title: "Enter code", variant: "destructive" });
            return;
        }

        if (message.toLowerCase().includes('available')) {
            toast({ 
                title: "Message Restricted", 
                description: "To ensure sellers respond, please avoid asking 'is it available'. Ask something specific instead.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await sendGuestEnquiry({
                sellerId,
                productId,
                productTitle,
                name,
                email,
                message,
                verificationCode
            });

            if (result.success) {
                // Persist verification
                localStorage.setItem('guest_email', email);
                localStorage.setItem('guest_code', verificationCode);
                localStorage.setItem('guest_name', name);

                toast({
                    title: "Message Sent!",
                    description: "The seller has been notified of your enquiry.",
                });

                // Track Lead Generation
                trackEcommerceEvent.generateLead({
                    id: productId,
                    title: productTitle,
                    price: 0, // In lead generation, we don't necessarily have the transaction value yet
                    category: '' // Category could be passed if available
                }, 'message');

                onClose();
                setVerificationCode(verificationCode); // Keep current code for session
                setStep('verify'); // Keep at verify step so they can send more messages
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to send message",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Contact Seller</DialogTitle>
                    <DialogDescription>
                        Send a message to the seller about <strong>{productTitle}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {step === 'details' ? (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Your Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Your Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    placeholder="Ask about condition, pickup, or price..."
                                    required
                                />
                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded border border-amber-100 italic">
                                    Note: Messages containing "is this available" will not be sent. Please ask something specific.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-900">Verify your email</h4>
                                <p className="text-xs text-slate-500">We've sent a 5-digit code to <strong>{email}</strong></p>
                            </div>
                            <div className="grid gap-2">
                                <Input
                                    placeholder="5-digit code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="text-center text-xl font-bold tracking-widest h-12"
                                    maxLength={5}
                                    required
                                />
                            </div>
                            <Button 
                                type="button" 
                                variant="link" 
                                className="text-xs text-indigo-600"
                                onClick={handleSendCode}
                                disabled={isSendingCode}
                            >
                                Resend code
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isSendingCode}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || isSendingCode || (step === 'verify' && !verificationCode)}>
                            {(isLoading || isSendingCode) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : step === 'details' ? <Send className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            {step === 'details' ? 'Next: Verify Email' : 'Send Message'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
