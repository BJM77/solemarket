'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { completeUserProfile } from '@/app/actions/auth-profile';

const formSchema = z.object({
    accountType: z.enum(['buyer', 'seller'], {
        required_error: 'You must select an account type.',
    }),
    storeName: z.string().optional(),
    storeDescription: z.string().optional(),
    acceptsStripe: z.boolean().default(false),
    acceptsCOD: z.boolean().default(false),
    acceptsPayID: z.boolean().default(false),
    agreedToTerms: z.boolean().refine((val) => val === true, {
        message: 'You must agree to the Terms & Conditions and Privacy Policy.',
    }),
}).refine((data) => {
    if (data.accountType === 'seller') {
        return !!data.storeName && data.storeName.length >= 2;
    }
    return true;
}, {
    message: 'Store name is required for sellers.',
    path: ['storeName'],
}).refine((data) => {
    if (data.accountType === 'seller') {
        return data.acceptsStripe || data.acceptsCOD || data.acceptsPayID;
    }
    return true;
}, {
    message: 'Sellers must select at least one payment method.',
    path: ['acceptsStripe'], // Attach error to the first payment method field
});

export default function CompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            accountType: 'buyer',
            storeName: '',
            storeDescription: '',
            acceptsStripe: true,
            acceptsCOD: false,
            acceptsPayID: false,
            agreedToTerms: false,
        },
    });

    const accountType = form.watch('accountType');

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const { success, error } = await completeUserProfile({
                accountType: values.accountType,
                storeName: values.storeName,
                storeDescription: values.storeDescription,
                acceptsStripe: values.acceptsStripe,
                acceptsCOD: values.acceptsCOD,
                acceptsPayID: values.acceptsPayID,
            });

            if (success) {
                toast({
                    title: 'Success!',
                    description: 'Your profile is now complete.',
                });
                // Force a hard navigation so the root layout picks up the completed session info
                window.location.href = '/';
            } else {
                throw new Error(error || 'Failed to complete profile.');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-white/10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold font-headline mb-2">Complete Your Profile</h1>
                    <p className="text-muted-foreground text-sm">
                        Just one more step before you can access the platform!
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="accountType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>I want to use Benched as a...</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="buyer" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Buyer</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="seller" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Seller</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {accountType === 'seller' && (
                            <div className="space-y-4 border-t pt-4 border-slate-200 dark:border-white/10">
                                <h3 className="text-lg font-medium">Seller Information</h3>
                                <FormField
                                    control={form.control}
                                    name="storeName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Store Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., John's Collectibles" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="storeDescription"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Store Description (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Specializing in rare cards and coins..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <FormLabel>Accepted Payment Methods</FormLabel>
                                        <p className="text-[0.8rem] text-muted-foreground">Select at least one way you want to be paid.</p>
                                    </div>
                                    
                                    <FormField
                                        control={form.control}
                                        name="acceptsStripe"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-white/10 p-3">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="text-sm font-normal">Card Payments (Stripe)</FormLabel>
                                                    <p className="text-[0.8rem] text-muted-foreground">Secure credit/debit processing.</p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={form.control}
                                        name="acceptsPayID"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-white/10 p-3">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="text-sm font-normal">PayID / Bank Transfer</FormLabel>
                                                    <p className="text-[0.8rem] text-muted-foreground">Direct transfer from buyers.</p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="acceptsCOD"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-white/10 p-3">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="text-sm font-normal">Cash on Delivery (COD)</FormLabel>
                                                    <p className="text-[0.8rem] text-muted-foreground">Local meetups and cash exchanges.</p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    
                                    {form.formState.errors.acceptsStripe?.message && (
                                        <p className="text-sm font-medium text-destructive mt-2">
                                            {form.formState.errors.acceptsStripe.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="agreedToTerms"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-white/10 p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal">
                                            I agree to the <Link href="/conditions" className="text-primary hover:underline">Terms & Conditions</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full h-12" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finish Setting Up
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
