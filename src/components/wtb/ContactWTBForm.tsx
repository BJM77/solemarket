'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { contactWTBSeller } from '@/app/actions/wtb';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { WantedListing } from '@/lib/types';
import { useUser } from '@/firebase';

const contactSchema = z.object({
    message: z.string().min(20, 'Message must be at least 20 characters').max(1000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactWTBFormProps {
    listing: WantedListing;
    trigger?: React.ReactNode;
}

export function ContactWTBForm({ listing, trigger }: ContactWTBFormProps) {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            message: '',
        },
    });

    const onSubmit = async (values: ContactFormValues) => {
        setIsSubmitting(true);
        try {
            if (!user) {
                toast({ title: 'Sign in required', description: 'Please sign in to contact this buyer', variant: 'destructive' });
                router.push(`/sign-in?redirect=/wtb/${listing.id}`);
                return;
            }

            const idToken = await getCurrentUserIdToken();
            if (!idToken) {
                toast({ title: 'Authentication failed', variant: 'destructive' });
                return;
            }

            const result = await contactWTBSeller(listing.id, values.message, idToken);

            if (result.success) {
                toast({
                    title: 'Message Sent!',
                    description: 'Your message has been sent to the buyer. They\'ll see it in their profile.',
                });
                setIsOpen(false);
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Failed to send',
                description: error.message || 'Could not send message',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Can't contact own listing
    if (user?.uid === listing.userId) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full h-12">
                        <Mail className="mr-2 h-4 w-4" />
                        Contact Buyer
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
                <DialogHeader className="px-4 sm:px-6">
                    <DialogTitle>Contact Buyer</DialogTitle>
                    <DialogDescription>
                        Send a message to <strong>{listing.userDisplayName}</strong> about their WTB listing.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 sm:px-6">
                        <div className="p-3 bg-muted rounded-lg text-sm">
                            <p className="font-semibold mb-1">They're looking for:</p>
                            <p className="text-muted-foreground">{listing.title}</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Hi! I have what you're looking for. Let me know if you're interested..."
                                            className="resize-none h-32"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Message
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
