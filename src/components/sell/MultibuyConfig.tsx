'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { MultibuyTier } from '@/types/multibuy';

interface MultibuyConfigProps {
    form: any;
}

export function MultibuyConfig({ form }: MultibuyConfigProps) {
    return (
        <>
            <FormField
                control={form.control}
                name="multibuyEnabled"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <FormLabel>Multibuy Discounts</FormLabel>
                            <FormDescription className="text-[10px]">
                                Offer bulk discounts for multiple quantities.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked && (form.getValues('multibuyTiers') || []).length === 0) {
                                        form.setValue('multibuyTiers', [
                                            { minQuantity: 2, discountPercent: 5 },
                                            { minQuantity: 5, discountPercent: 10 }
                                        ]);
                                    }
                                }}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
            {form.watch('multibuyEnabled') && (
                <div className="border border-white/10 rounded-2xl p-5 space-y-4 bg-slate-950/40 backdrop-blur-md shadow-2xl">
                    <FormField
                        control={form.control}
                        name="multiCardTier"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-bold text-slate-300">Multibuy Tier Color</FormLabel>
                                <FormDescription className="text-xs text-slate-500">Select the badge color for this volume discount.</FormDescription>
                                <div className="grid grid-cols-4 gap-3 mt-3">
                                    {[
                                        { id: 'bronze', label: 'Bronze', color: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 border border-amber-600/30', text: 'text-amber-100 shadow-md shadow-amber-950/50' },
                                        { id: 'silver', label: 'Silver', color: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 border border-slate-400/30', text: 'text-slate-100 shadow-md shadow-slate-900/50' },
                                        { id: 'gold', label: 'Gold', color: 'bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 border border-yellow-400/40', text: 'text-amber-950 font-black shadow-md shadow-yellow-950/20' },
                                        { id: 'platinum', label: 'Platinum', color: 'bg-gradient-to-br from-slate-100 via-indigo-100 to-slate-200 border border-indigo-200/50', text: 'text-indigo-950 font-black shadow-md shadow-indigo-950/10' }
                                    ].map((tier) => (
                                        <div
                                            key={tier.id}
                                            onClick={() => field.onChange(tier.id)}
                                            className={`
                                                cursor-pointer rounded-xl p-3 text-center transition-all duration-300 active:scale-95 flex items-center justify-center min-h-[48px]
                                                ${field.value === tier.id ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 scale-[1.03] opacity-100' : 'opacity-60 hover:opacity-100 border border-white/5'}
                                                ${tier.color}
                                            `}
                                        >
                                            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${tier.text}`}>{tier.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </FormItem>
                        )}
                    />
 
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <Label className="text-sm font-bold text-slate-300">Discount Tiers</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-xs font-semibold h-8"
                            onClick={() => {
                                const currentTiers = form.getValues('multibuyTiers') || [];
                                const lastTier = currentTiers[currentTiers.length - 1];
                                const newMinQty = lastTier ? lastTier.minQuantity + 3 : 2;
                                const newDiscount = lastTier ? Math.min(lastTier.discountPercent + 5, 50) : 5;
                                form.setValue('multibuyTiers', [
                                    ...currentTiers,
                                    { minQuantity: newMinQty, discountPercent: newDiscount }
                                ]);
                            }}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Tier
                        </Button>
                    </div>
                    
                    <div className="space-y-2">
                        {(form.watch('multibuyTiers') || []).map((tier: MultibuyTier, index: number) => (
                            <div key={index} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 text-white animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Min Qty</Label>
                                    <Input
                                        type="number"
                                        min="2"
                                        value={tier.minQuantity}
                                        onChange={(e) => {
                                            const tiers = [...(form.getValues('multibuyTiers') || [])];
                                            tiers[index].minQuantity = parseInt(e.target.value) || 2;
                                            form.setValue('multibuyTiers', tiers);
                                        }}
                                        className="mt-1 h-9 bg-slate-900/60 border-white/10 text-white focus-visible:ring-indigo-500 rounded-lg text-xs"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Discount %</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={tier.discountPercent}
                                        onChange={(e) => {
                                            const tiers = [...(form.getValues('multibuyTiers') || [])];
                                            tiers[index].discountPercent = parseInt(e.target.value) || 1;
                                            form.setValue('multibuyTiers', tiers);
                                        }}
                                        className="mt-1 h-9 bg-slate-900/60 border-white/10 text-white focus-visible:ring-indigo-500 rounded-lg text-xs"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        const tiers = (form.getValues('multibuyTiers') || []).filter((_: any, i: number) => i !== index);
                                        form.setValue('multibuyTiers', tiers);
                                    }}
                                    disabled={(form.getValues('multibuyTiers') || []).length === 1}
                                    className="mt-5 hover:bg-red-500/10 hover:text-red-400 rounded-lg h-9 w-9 text-slate-400"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
