
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
            <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/10 text-white shadow-2xl rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black italic flex items-center gap-3 text-white">
                        <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                            <Send className="h-5 w-5 text-primary" />
                        </div>
                        Secure Inquiry
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-lg">
                        Explain your deal or ask any questions. A verified Benched concierge will review your message immediately.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-300 font-bold ml-1">Your Name</Label>
                            <Input
                                id="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-white/5 border-white/10 h-12 focus:ring-primary text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300 font-bold ml-1">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="bg-white/5 border-white/10 h-12 focus:ring-primary text-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-300 font-bold ml-1">Phone Number (Optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+61 400 000 000"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="bg-white/5 border-white/10 h-12 focus:ring-primary text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message" className="text-slate-300 font-bold ml-1">Deal Details</Label>
                        <Textarea
                            id="message"
                            placeholder="I'm buying a high-value item and want to use DealSafe for verification..."
                            className="min-h-[120px] bg-white/5 border-white/10 focus:ring-primary text-white resize-none p-4"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            required
                        />
                        <p className="text-[10px] text-slate-500 italic mt-2">
                            * All inquiries are encrypted and handled exclusively by verified Benched concierge staff.
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full h-14 text-xl font-black italic rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={isPending}>
                            {isPending ? (
                                <><Loader2 className="mr-3 h-6 w-6 animate-spin text-white" /> Sending...</>
                            ) : (
                                <><Send className="mr-3 h-5 w-5 text-white" /> Secure Transmission</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
