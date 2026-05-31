
'use client';

import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DollarSign } from 'lucide-react';
import { MultibuyConfig } from '@/components/sell/MultibuyConfig';
import { cn } from '@/lib/utils';
import { PricingCompsChart } from './PricingCompsChart';

interface PricingAndDeliveryStepProps {
    form: any;
    suggestedFields?: string[];
    onFieldChange?: (field: string) => void;
    analyzingFields?: Record<string, boolean>;
}

export function PricingAndDeliveryStep({ 
    form, 
    suggestedFields = [], 
    onFieldChange,
    analyzingFields = {}
}: PricingAndDeliveryStepProps) {
    const isPriceSuggested = suggestedFields.includes('price');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Price & Delivery</h2>
                <p className="text-muted-foreground">Set your price and selling options.</p>
            </div>

            <Card className="border-0 shadow-md bg-card">
                <CardHeader><CardTitle>Price & Quantity</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem className="col-span-2">
                            <div className="flex items-center justify-between h-5">
                                <FormLabel>Price (AUD) <span className="text-red-500">*</span></FormLabel>
                                {analyzingFields['price'] ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 animate-pulse">
                                        AI Estimating...
                                    </div>
                                ) : isPriceSuggested ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary animate-pulse">
                                        ✨ AI Value
                                    </div>
                                ) : null}
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        className={cn(
                                            "pl-9", 
                                            isPriceSuggested && "bg-primary/5 border-primary/30",
                                            analyzingFields['price'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )} 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('price');
                                        }}
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                            
                            {/* Real-time interactive pricing comps sparkline (Phase 2) */}
                            {Number(form.watch('price')) > 0 && (
                                <PricingCompsChart price={Number(form.watch('price'))} />
                            )}
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                            <FormLabel>Quantity <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input type="number" min="1" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>


            <Card className="border-0 shadow-md bg-card">
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
                            <FormItem className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
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
                            <FormItem className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Reverse Bidding</FormLabel>
                                    <FormDescription className="text-[10px]">Lowest bid wins.</FormDescription>
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
                        name="isDutchAuction"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Time-Based Dutch Auction</FormLabel>
                                    <FormDescription className="text-[10px]">Price drops automatically over time to create urgency.</FormDescription>
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

                    {form.watch('isDutchAuction') && (
                        <div className="space-y-4 p-4 rounded-lg bg-black/20 border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <FormField control={form.control} name="dutchAuctionDropAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price Drop Amount ($)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="dutchAuctionIntervalHours" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Drop Interval (Hours)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="dutchAuctionFloorPrice" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Floor / Reserve Price ($)</FormLabel>
                                    <FormDescription className="text-[10px]">The price will never drop below this amount.</FormDescription>
                                    <FormControl>
                                        <Input type="number" min="0" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                    <FormField
                        control={form.control}
                        name="acceptsPayId"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-primary font-bold">Accept PayID / Bank Transfer</FormLabel>
                                    <FormDescription className="text-[10px]">Allow buyers to pay you directly via PayID or Bank Transfer.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-primary"
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
