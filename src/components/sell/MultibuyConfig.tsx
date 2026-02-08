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
                                    if (checked && form.getValues('multibuyTiers').length === 0) {
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
                <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Discount Tiers</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const currentTiers = form.getValues('multibuyTiers');
                                const lastTier = currentTiers[currentTiers.length - 1];
                                const newMinQty = lastTier ? lastTier.minQuantity + 3 : 2;
                                const newDiscount = lastTier ? Math.min(lastTier.discountPercent + 5, 50) : 5;
                                form.setValue('multibuyTiers', [
                                    ...currentTiers,
                                    { minQuantity: newMinQty, discountPercent: newDiscount }
                                ]);
                            }}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Tier
                        </Button>
                    </div>
                    {form.watch('multibuyTiers').map((tier: MultibuyTier, index: number) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                            <div className="flex-1">
                                <Label className="text-xs">Min Qty</Label>
                                <Input
                                    type="number"
                                    min="2"
                                    value={tier.minQuantity}
                                    onChange={(e) => {
                                        const tiers = [...form.getValues('multibuyTiers')];
                                        tiers[index].minQuantity = parseInt(e.target.value) || 2;
                                        form.setValue('multibuyTiers', tiers);
                                    }}
                                    className="mt-1 h-8"
                                />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs">Discount %</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={tier.discountPercent}
                                    onChange={(e) => {
                                        const tiers = [...form.getValues('multibuyTiers')];
                                        tiers[index].discountPercent = parseInt(e.target.value) || 1;
                                        form.setValue('multibuyTiers', tiers);
                                    }}
                                    className="mt-1 h-8"
                                />
                            </div>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                    const tiers = form.getValues('multibuyTiers').filter((_: any, i: number) => i !== index);
                                    form.setValue('multibuyTiers', tiers);
                                }}
                                disabled={form.getValues('multibuyTiers').length === 1}
                                className="mt-5"
                            >
                                <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
