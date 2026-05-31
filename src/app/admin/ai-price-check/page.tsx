'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { getAIRecommendedPrice, PricingRecommendation } from '@/app/actions/admin/ai-pricing';
import { Loader2, Sparkles, Check, X, ExternalLink, RefreshCw } from 'lucide-react';
import { getProductUrl } from '@/lib/utils';
import Link from 'next/link';

export interface ProductRowRef {
    checkPrice: () => Promise<void>;
    status: 'pending' | 'updated' | 'left';
}

const ProductRow = forwardRef<ProductRowRef, { product: Product, idToken: string }>(({ product, idToken }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<PricingRecommendation | null>(null);
    const [status, setStatus] = useState<'pending' | 'updated' | 'left'>('pending');

    const handleCheckPrice = async () => {
        if (isLoading || recommendation || status !== 'pending') return;
        setIsLoading(true);
        try {
            const result = await getAIRecommendedPrice(idToken, {
                title: product.title,
                description: product.description,
                category: product.category,
                subCategory: product.subCategory,
                condition: product.condition,
                price: product.price
            });
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            const rec = result.data;
            if (rec && typeof rec.recommendedPrice === 'number') {
                setRecommendation(rec);
            } else {
                throw new Error("AI returned invalid pricing format");
            }
        } catch (error) {
            console.error("Failed to check price:", error);
            // Don't alert here to avoid spam, just throw for the queue
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        checkPrice: handleCheckPrice,
        status
    }));

    const handleUpdate = async () => {
        if (!recommendation) return;
        setIsLoading(true);
        try {
            const productRef = doc(db, 'products', product.id);
            await updateDoc(productRef, { price: recommendation.recommendedPrice });
            setStatus('updated');
        } catch (error) {
            console.error("Failed to update price:", error);
            alert("Failed to update price.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeave = () => {
        setStatus('left');
    };

    return (
        <div className={`flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg transition-colors ${status !== 'pending' ? 'bg-muted/50 opacity-70' : 'bg-background'}`}>
            <div className="flex items-center gap-4 w-full md:w-1/3 mb-4 md:mb-0">
                <div className="h-16 w-16 bg-muted rounded-md overflow-hidden shrink-0 relative">
                    {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.title} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
                    )}
                </div>
                <div className="min-w-0">
                    <Link href={getProductUrl(product)} target="_blank" className="font-bold hover:underline truncate block flex items-center gap-1">
                        {product.title} <ExternalLink className="h-3 w-3" />
                    </Link>
                    <div className="text-sm text-muted-foreground truncate">{product.category} {product.subCategory ? `• ${product.subCategory}` : ''}</div>
                    <Badge variant="outline" className="mt-1">{product.condition || 'No condition'}</Badge>
                </div>
            </div>

            <div className="w-full md:w-1/4 text-center mb-4 md:mb-0">
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-lg font-black">${product.price?.toLocaleString() || 0}</div>
            </div>

            <div className="w-full md:w-1/3 flex flex-col items-center justify-center gap-2">
                {status === 'updated' ? (
                    <div className="text-emerald-500 font-bold flex items-center gap-2"><Check className="h-4 w-4" /> Updated to ${recommendation?.recommendedPrice}</div>
                ) : status === 'left' ? (
                    <div className="text-muted-foreground font-bold flex items-center gap-2"><X className="h-4 w-4" /> Left as ${product.price}</div>
                ) : recommendation ? (
                    <div className="flex flex-col items-center w-full">
                        <div className="text-sm text-primary font-bold">AI Suggests: ${recommendation.recommendedPrice}</div>
                        <div className="text-xs text-muted-foreground text-center mb-2 px-2 italic line-clamp-2" title={recommendation.reasoning}>
                            {recommendation.reasoning}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdate} disabled={isLoading} className="bg-primary hover:bg-orange-600">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleLeave} disabled={isLoading}>Leave</Button>
                        </div>
                    </div>
                ) : (
                    <Button size="sm" variant="secondary" onClick={() => handleCheckPrice().catch(() => alert("Failed to fetch recommendation."))} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-primary" />}
                        Check Price
                    </Button>
                )}
            </div>
        </div>
    );
});
ProductRow.displayName = 'ProductRow';

export default function AIPriceCheckPage() {
    const { user } = useUser();
    const { isSuperAdmin, isLoading: isAuthLoading } = useUserPermissions();

    const [isCheckingAll, setIsCheckingAll] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    const q = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(db, 'products'),
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [user]);
    const { data: products, isLoading: isProductsLoading } = useCollection<Product>(q);

    const [idToken, setIdToken] = useState<string>('');
    const rowRefs = useRef<{ [key: string]: ProductRowRef | null }>({});

    // Fetch token for the server action
    useEffect(() => {
        if (user) {
            user.getIdToken().then(setIdToken);
        }
    }, [user]);

    const handleCheckAll = async () => {
        if (!products || products.length === 0) return;
        setIsCheckingAll(true);
        
        try {
            for (const product of products) {
                const row = rowRefs.current[product.id];
                if (row && row.status === 'pending') {
                    // Sequential processing with a 1.5s delay to avoid free-tier rate limits
                    await row.checkPrice().catch(console.error);
                    await new Promise(res => setTimeout(res, 1500));
                }
            }
        } finally {
            setIsCheckingAll(false);
        }
    };

    const handleMigrateAll = async () => {
        if (!user) return;
        if (!confirm("Are you sure you want to move EVERY single product on the marketplace to be owned by your account?")) return;
        
        setIsMigrating(true);
        try {
            const allProductsQuery = query(collection(db, 'products'));
            const snapshot = await getDocs(allProductsQuery);
            const batch = writeBatch(db);
            let count = 0;
            
            snapshot.docs.forEach(d => {
                if (d.data().sellerId !== user.uid) {
                    batch.update(d.ref, {
                        sellerId: user.uid,
                        sellerName: user.displayName || 'Admin',
                        sellerEmail: user.email || ''
                    });
                    count++;
                }
            });
            
            if (count > 0) {
                await batch.commit();
                alert(`Successfully migrated ${count} products to your account!`);
            } else {
                alert("No products needed migrating. They are already yours.");
            }
        } catch (error) {
            console.error("Migration failed:", error);
            alert("Migration failed.");
        } finally {
            setIsMigrating(false);
        }
    };

    if (isAuthLoading || isProductsLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-500 font-bold">Unauthorized. Super Admin access required.</div>;
    }

    return (
        <div className="space-y-6 p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Price Checker</h1>
                    <p className="text-muted-foreground">Automatically evaluate and correct marketplace listings using Gemini 2.0.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Button variant="destructive" onClick={handleMigrateAll} disabled={isMigrating}>
                        {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Take Ownership of All Listings
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Active Marketplace Listings</CardTitle>
                        <CardDescription>Review all listings. Click "Check Price" to get an AI valuation, then quickly Update or Leave.</CardDescription>
                    </div>
                    <Button onClick={handleCheckAll} disabled={isCheckingAll || !products || products.length === 0} className="bg-primary hover:bg-orange-600">
                        {isCheckingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {isCheckingAll ? "Checking..." : "Check All Prices"}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {products?.map((product) => (
                            <ProductRow 
                                key={product.id} 
                                product={product} 
                                idToken={idToken} 
                                ref={el => rowRefs.current[product.id] = el}
                            />
                        ))}
                        {(!products || products.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                                No products found in the marketplace.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
