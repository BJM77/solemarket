'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CheckCircle, HandCoins, Archive, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { submitSellerApplication } from '@/app/actions/seller-application';

const formSchema = z.object({
    listingQuantity: z.coerce.number().min(1, {
        message: 'Must list at least 1 item.',
    }),
    valueRange: z.string().min(1, {
        message: 'Please select a value range.',
    }),
    tradingHistory: z.string().min(1, {
        message: 'Please select your trading history.',
    }),
});

type FormValues = z.infer<typeof formSchema>;

export default function SellerApplicationForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            listingQuantity: 1,
            valueRange: '',
            tradingHistory: '',
        },
    });

    async function onSubmit(data: FormValues) {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('listingQuantity', String(data.listingQuantity));
            formData.append('valueRange', data.valueRange);
            formData.append('tradingHistory', data.tradingHistory);

            const result = await submitSellerApplication(formData);

            if (result.error) {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Application Submitted',
                    description: `You have been upgraded to ${result.isBusiness ? 'Business Account' : 'Seller Account'}.`,
                });
                router.push('/sell/dashboard');
                router.refresh();
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="listingQuantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Archive className="h-4 w-4" />
                                How many items do you wish to list?
                            </FormLabel>
                            <FormControl>
                                <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormDescription>
                                Entering over 50 items will automatically upgrade you to a Business Account.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="valueRange"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <HandCoins className="h-4 w-4" />
                                What is the value range of your items?
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a range" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="low">$0 - $100</SelectItem>
                                    <SelectItem value="mid">$100 - $1,000</SelectItem>
                                    <SelectItem value="high">$1,000 - $10,000</SelectItem>
                                    <SelectItem value="premium">$10,000+</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="tradingHistory"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                How long have you been trading?
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="new">New to trading</SelectItem>
                                    <SelectItem value="1-2">1 - 2 years</SelectItem>
                                    <SelectItem value="3-5">3 - 5 years</SelectItem>
                                    <SelectItem value="5+">5+ years</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Submit Application
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}
