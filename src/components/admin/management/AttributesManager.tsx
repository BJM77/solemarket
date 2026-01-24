
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Tag } from 'lucide-react';

interface Attributes {
    conditions?: string[];
    manufacturers?: string[];
    brands?: string[];
}

const attributeSchema = z.object({
    newValue: z.string().min(1, 'Value cannot be empty'),
});

type AttributeFormValues = z.infer<typeof attributeSchema>;

type AttributeType = keyof Attributes;

const AttributeEditor = ({ title, attributeKey, data, isLoading }: { title: string, attributeKey: AttributeType, data: Attributes | null, isLoading: boolean }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<AttributeFormValues>({ resolver: zodResolver(attributeSchema) });

    const values = data?.[attributeKey] || [];

    const handleAdd = async (formData: AttributeFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const optionsRef = doc(firestore, 'settings', 'marketplace_options');
            await updateDoc(optionsRef, {
                [attributeKey]: arrayUnion(formData.newValue)
            });
            toast({ title: `${title} value added.` });
            form.reset({ newValue: '' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (value: string) => {
        if (!firestore) return;
        try {
            const optionsRef = doc(firestore, 'settings', 'marketplace_options');
            await updateDoc(optionsRef, {
                [attributeKey]: arrayRemove(value)
            });
            toast({ title: `${title} value removed.` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(handleAdd)} className="flex gap-2 mb-4">
                    <Input {...form.register('newValue')} placeholder={`New ${title} value...`} />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </form>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {values.map(val => (
                            <div key={val} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm">{val}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove(val)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function AttributesManager() {
    const { firestore } = useFirebase();
    const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
    const { data, isLoading } = useDoc<Attributes>(optionsRef);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AttributeEditor title="Conditions" attributeKey="conditions" data={data} isLoading={isLoading} />
            <AttributeEditor title="Manufacturers" attributeKey="manufacturers" data={data} isLoading={isLoading} />
            <AttributeEditor title="Brands" attributeKey="brands" data={data} isLoading={isLoading} />
        </div>
    );
}

