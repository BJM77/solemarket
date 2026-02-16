
'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DetailsStepProps {
    form: any;
    selectedType: 'cards' | 'coins' | 'general';
    subCategories: Record<string, string[]>;
    conditionOptions: string[];
}

export function DetailsStep({ form, selectedType, subCategories, conditionOptions }: DetailsStepProps) {
    const category = form.watch('category') || (selectedType === 'cards' ? 'Collector Cards' : selectedType === 'coins' ? 'Coins' : 'General');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Item Details</h2>
                <p className="text-muted-foreground">Describe your item accurately.</p>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle>Core Information</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="Descriptive title..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="subCategory" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specific Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selection" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {(subCategories[category] || []).map((s: string) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="condition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condition <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {conditionOptions.map((c: string) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="Describe any flaws, history, or unique features..." {...field} /></FormControl>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle>{selectedType === 'cards' ? 'Card Specs' : selectedType === 'coins' ? 'Coin Specs' : 'Item Specs'}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedType === 'cards' && (
                        <>
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="cardNumber" render={({ field }) => (
                                <FormItem><FormLabel>Card #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="gradingCompany" render={({ field }) => (
                                <FormItem><FormLabel>Grading Co.</FormLabel><FormControl><Input placeholder="PSA, BGS, SGC..." {...field} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                    {selectedType === 'coins' && (
                        <>
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="denomination" render={({ field }) => (
                                <FormItem><FormLabel>Denomination</FormLabel><FormControl><Input placeholder="e.g. $1, 50c..." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="mintMark" render={({ field }) => (
                                <FormItem><FormLabel>Mint Mark</FormLabel><FormControl><Input placeholder="e.g. P, D, S..." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="metal" render={({ field }) => (
                                <FormItem><FormLabel>Metal</FormLabel><FormControl><Input placeholder="Silver, Gold..." {...field} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                    {selectedType === 'general' && (
                        <>
                            <FormField control={form.control} name="dimensions" render={({ field }) => (
                                <FormItem><FormLabel>Dimensions (WxHxD)</FormLabel><FormControl><Input placeholder="30x40x10 cm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="material" render={({ field }) => (
                                <FormItem><FormLabel>Material</FormLabel><FormControl><Input placeholder="Leather, Canvas..." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="authentication" render={({ field }) => (
                                <FormItem><FormLabel>Authentication (COA)</FormLabel><FormControl><Input placeholder="Beckett, JSA..." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="weight" render={({ field }) => (
                                <FormItem><FormLabel>Weight</FormLabel><FormControl><Input placeholder="1.5 kg" {...field} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
