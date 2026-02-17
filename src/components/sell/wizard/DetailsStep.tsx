

'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandRequestModal } from '../BrandRequestModal';

interface DetailsStepProps {
    form: any;
    selectedType: 'sneakers' | 'accessories';
    subCategories: Record<string, string[]>;
    conditionOptions: string[];
}

export function DetailsStep({ form, selectedType, subCategories, conditionOptions }: DetailsStepProps) {
    const category = form.watch('category') || (selectedType === 'sneakers' ? 'Sneakers' : 'Accessories');

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
                            <FormControl><Input placeholder="e.g. Air Jordan 1 High OG Chicago" {...field} /></FormControl>
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

                    <FormField control={form.control} name="brand" render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Brand</FormLabel>
                                <BrandRequestModal />
                            </div>
                            <FormControl><Input placeholder="Nike, Adidas, Supreme..." {...field} /></FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="Describe any flaws, history, or unique features..." {...field} /></FormControl>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle title="Specifics">{selectedType === 'sneakers' ? 'Sneaker Specs' : 'Item Specs'}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedType === 'sneakers' && (
                        <>
                            <FormField control={form.control} name="size" render={({ field }) => (
                                <FormItem><FormLabel>Size (US)</FormLabel><FormControl><Input placeholder="e.g. 10.5" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="styleCode" render={({ field }) => (
                                <FormItem><FormLabel>Style Code</FormLabel><FormControl><Input placeholder="e.g. DZ5485-612" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="colorway" render={({ field }) => (
                                <FormItem><FormLabel>Colorway</FormLabel><FormControl><Input placeholder="e.g. Varsity Red/Black/Sail" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem><FormLabel>Release Year</FormLabel><FormControl><Input type="number" placeholder="2015" {...field} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                    {selectedType === 'accessories' && (
                        <>
                            <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="Black, White..." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="material" render={({ field }) => (
                                <FormItem><FormLabel>Material</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
