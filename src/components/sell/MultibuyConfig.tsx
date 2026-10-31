'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { MultibuyTier } from '@/types/multibuy';
import { BundleTierPicker } from '@/components/sell/BundleTierPicker';

interface MultibuyConfigProps {
    form: any;
}

export function MultibuyConfig({ form }: MultibuyConfigProps) {
    const category = form.watch('category');
    return (
        <>
            <BundleTierPicker
                category={category}
                value={form.watch('multiCardTier')}
                onChange={(v) => form.setValue('multiCardTier', v, { shouldDirty: true })}
            />
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
                <div className="border border-border rounded-2xl p-5 space-y-4 bg-background/40 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center justify-between ">
                        <Label className="text-sm font-bold text-foreground/80">Discount Tiers</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-border bg-muted/60 text-foreground/80 hover:bg-muted hover:text-foreground rounded-lg text-xs font-semibold h-8"
                            onClick={() => {
                                const currentTiers = form.getValues('multibuyTiers') || [];
                                const lastTier = currentTiers[currentTiers.length - 1];
                                const newMinQty = lastTier ? lastTier.minQuantity + 3 : 2;
                                const newDiscount = lastTier ? Math.min(lastTier.discountPercent + 5, 90) : 5;
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
                            <div key={index} className="flex items-center gap-4 bg-muted/60 p-3 rounded-xl border border-border text-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Min Qty</Label>
                                    <Input
                                        type="number"
                                        min="2"
                                        value={tier.minQuantity}
                                        onChange={(e) => {
                                            const tiers = [...(form.getValues('multibuyTiers') || [])];
                                            tiers[index].minQuantity = parseInt(e.target.value) || 2;
                                            form.setValue('multibuyTiers', tiers);
                                        }}
                                        className="mt-1 h-9 bg-card/60 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg text-xs"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Discount %</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={tier.discountPercent}
                                        onChange={(e) => {
                                            const tiers = [...(form.getValues('multibuyTiers') || [])];
                                            tiers[index].discountPercent = Math.min(90, Math.max(1, parseInt(e.target.value) || 1));
                                            form.setValue('multibuyTiers', tiers);
                                        }}
                                        className="mt-1 h-9 bg-card/60 border-border text-foreground focus-visible:ring-indigo-500 rounded-lg text-xs"
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
                                    className="mt-5 hover:bg-red-500/10 hover:text-red-600 rounded-lg h-9 w-9 text-muted-foreground"
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
