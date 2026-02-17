
'use client';

import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DollarSign } from 'lucide-react';
import { MultibuyConfig } from '@/components/sell/MultibuyConfig';

interface PricingAndDeliveryStepProps {
    form: any;
}

export function PricingAndDeliveryStep({ form }: PricingAndDeliveryStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Price & Delivery</h2>
                <p className="text-muted-foreground">Set your price and selling options.</p>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle>Price & Quantity</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price (AUD) <span className="text-red-500">*</span></FormLabel>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <FormControl><Input type="number" step="0.01" className="pl-9" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input type="number" min="1" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5" /> Selling Options
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="isNegotiable"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Allow Offers</FormLabel>
                                    <FormDescription className="text-[10px]">Buyers can make binding offers on this item.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="isReverseBidding"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Reverse Bidding</FormLabel>
                                    <FormDescription className="text-[10px]">Lowest bid wins (Dutch auction style).</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <MultibuyConfig form={form} />
                </CardContent>
            </Card>
        </div>
    );
}
