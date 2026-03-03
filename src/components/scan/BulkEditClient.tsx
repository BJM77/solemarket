'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBulkProductsAction } from '@/app/actions/products';
import Image from 'next/image';

interface BulkCard {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    subCategory: string;
    condition: string;
    brand: string;
    model: string;
    localPreview: string;
    quantity: number;
    isNegotiable: boolean;
    isVault: boolean;
}

export function BulkEditClient() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();

    const [cards, setCards] = useState<BulkCard[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = sessionStorage.getItem('bulk_scan_results');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Initialize editable fields
                const initialized = parsed.map((c: any) => ({
                    ...c,
                    quantity: 1,
                    isNegotiable: true,
                    isVault: false
                }));
                setCards(initialized);
            } catch (e) {
                console.error("Failed to parse bulk results", e);
            }
        }
        setIsLoading(false);
    }, []);

    const updateCard = (index: number, field: keyof BulkCard, value: any) => {
        setCards(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeCard = (index: number) => {
        setCards(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        if (!user) return;
        setIsSaving(true);

        try {
            const idToken = await user.getIdToken();
            
            // Clean data for Firestore
            const productsToCreate = cards.map(({ localPreview, ...c }) => ({
                ...c,
                // localPreview now contains the permanent Firebase Storage URL from the scanner step
                imageUrls: [localPreview] 
            }));

            const result = await createBulkProductsAction(idToken, productsToCreate as any);

            if (result.success) {
                toast({ 
                    title: "Success!", 
                    description: `Created ${result.count} listings.`,
                    className: "bg-green-600 text-white"
                });
                sessionStorage.removeItem('bulk_scan_results');
                router.push('/dashboard');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ 
                title: "Error saving", 
                description: error.message, 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-12 h-12 text-indigo-600" /></div>;
    
    if (cards.length === 0) {
        return (
            <div className="text-center py-20 space-y-4">
                <h1 className="text-3xl font-black">No Cards Found</h1>
                <p className="text-muted-foreground">Go back to the scanner to upload your cards.</p>
                <Button onClick={() => router.push('/card-scan')}>Go to Scanner</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md py-4 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-3xl font-black tracking-tight">Bulk Review</h1>
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {cards.length} Items
                    </span>
                </div>
                <Button 
                    variant="default" 
                    size="lg" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 font-black shadow-xl"
                    onClick={handleSaveAll}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <Save className="mr-2" />
                    )}
                    List All {cards.length} Cards
                </Button>
            </div>

            <Card className="overflow-hidden border-2 border-indigo-500/10 shadow-2xl">
                <Table>
                    <TableHeader className="bg-gray-100 dark:bg-gray-800">
                        <TableRow>
                            <TableHead className="w-[100px]">Photo</TableHead>
                            <TableHead className="min-w-[250px]">Card Details</TableHead>
                            <TableHead className="w-[150px]">Price (AUD)</TableHead>
                            <TableHead className="w-[100px]">Qty</TableHead>
                            <TableHead className="w-[150px]">Settings</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cards.map((card, idx) => (
                            <TableRow key={card.id} className="hover:bg-indigo-50/30 transition-colors">
                                <TableCell>
                                    <div className="relative aspect-[2.5/3.5] w-20 rounded border overflow-hidden bg-white">
                                        <Image
                                            src={card.localPreview}
                                            alt={card.title}
                                            fill
                                            className="object-contain p-1"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <Input 
                                            value={card.title} 
                                            onChange={(e) => updateCard(idx, 'title', e.target.value)}
                                            className="font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-lg"
                                            aria-label={`Title for card ${idx + 1}`}
                                        />
                                        <div className="flex gap-2 text-xs">
                                            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded font-medium">{card.brand}</span>
                                            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded font-medium">{card.condition}</span>
                                            <span className="text-muted-foreground">{card.subCategory}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input 
                                            type="number" 
                                            value={card.price} 
                                            onChange={(e) => updateCard(idx, 'price', parseFloat(e.target.value))}
                                            className="pl-7 font-bold text-green-600 bg-white dark:bg-gray-800"
                                            aria-label={`Price for card ${idx + 1}`}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={card.quantity} 
                                        onChange={(e) => updateCard(idx, 'quantity', parseInt(e.target.value))}
                                        className="font-bold bg-white dark:bg-gray-800"
                                        aria-label={`Quantity for card ${idx + 1}`}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`neg-${idx}`} 
                                                checked={card.isNegotiable} 
                                                onCheckedChange={(checked) => updateCard(idx, 'isNegotiable', !!checked)}
                                            />
                                            <label htmlFor={`neg-${idx}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Negotiable
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`vault-${idx}`} 
                                                checked={card.isVault} 
                                                onCheckedChange={(checked) => updateCard(idx, 'isVault', !!checked)}
                                            />
                                            <label htmlFor={`vault-${idx}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Vault It
                                            </label>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-muted-foreground hover:text-red-500"
                                        onClick={() => removeCard(idx)}
                                        aria-label={`Remove card ${idx + 1}`}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
