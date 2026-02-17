
'use client';

import { useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { submitEnquiry } from '@/app/actions/enquiries';
import { Loader2, Send } from 'lucide-react';
import { useUser } from '@/firebase';

export function DealSafeEnquiryDialog({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        message: '',
        phoneNumber: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.message.trim()) {
            toast({
                title: "Inquiry is empty",
                description: "Please provide some details about your inquiry.",
                variant: "destructive"
            });
            return;
        }

        startTransition(async () => {
            const result = await submitEnquiry({
                ...formData,
                type: 'dealsafe',
                userId: user?.uid,
                subject: 'DealSafe Expert Inquiry'
            });

            if (result.success) {
                toast({
                    title: "Inquiry Sent",
                    description: result.message,
                });
                setIsOpen(false);
                setFormData(prev => ({ ...prev, message: '' })); // Reset message
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        Contact a DealSafe Expert
                    </DialogTitle>
                    <DialogDescription>
                        Explain your deal or ask any questions. A verified Benched concierge will review your message and reach out.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="For faster response"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message / Deal Details</Label>
                        <Textarea
                            id="message"
                            placeholder="E.g., I'm buying a high-value card and want to use DealSafe for verification..."
                            className="min-h-[150px] resize-none"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            All inquiries are encrypted and handled exclusively by super-admin verified concierge staff.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isPending}>
                            {isPending ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
                            ) : (
                                <><Send className="mr-2 h-5 w-5" /> Send to Concierge</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
