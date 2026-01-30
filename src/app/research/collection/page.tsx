'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Loader, ArrowLeft, Gem, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUser } from '@/firebase';
import type { ScanHistoryItem } from '@/lib/research-types';
import { getScanHistory } from '@/app/actions/research';
import { useToast } from '@/hooks/use-toast';
import { formatCardDetails } from '@/lib/card-logic';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

export default function CollectionPage() {
    const [keepers, setKeepers] = useState<ScanHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/research/collection');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                try {
                    const parsed = await getScanHistory(user.uid);
                    // Filter only keepers where image is present (optional: server could return all)
                    // The getScanHistory action returns a list.
                    // We only want keepers here.
                    setKeepers(parsed.filter((item) => item.isKeeper && item.imageDataUri));
                } catch (error) {
                    console.error('Failed to load collection:', error);
                    toast({ title: "Failed to load collection", variant: "destructive" });
                    setKeepers([]);
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [user, toast]);

    if (isUserLoading || isLoading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="My Collection"
                description="View your keeper cards from scans"
            />

            <div className="flex gap-4 mt-6 mb-8">
                <Button variant="outline" asChild>
                    <Link href="/research">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Scanner
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/research/keep-list">
                        <Star className="mr-2 h-4 w-4" />
                        Keep List
                    </Link>
                </Button>
            </div>

            {keepers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Keepers Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Scan cards and keeper cards will appear here
                        </p>
                        <Button asChild>
                            <Link href="/research">Start Scanning</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold">Your Keepers ({keepers.length})</h2>
                        <p className="text-muted-foreground">Cards you've scanned and kept</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {keepers.map((card) => (
                            <Card key={card.id} className={`overflow-hidden ${card.isPrizmRookie ? 'border-yellow-400 border-2' : ''}`}>
                                <div className="relative aspect-[2.5/3.5] bg-gray-100">
                                    {card.imageDataUri && (
                                        <Image
                                            src={card.imageDataUri}
                                            alt={card.name}
                                            fill
                                            className="object-contain"
                                        />
                                    )}
                                    {card.isPrizmRookie && (
                                        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <Gem className="h-3 w-3" />
                                            PRIZM
                                        </div>
                                    )}
                                </div>
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm line-clamp-1">{card.name}</CardTitle>
                                    <CardDescription className="text-xs line-clamp-2">
                                        {formatCardDetails(card)}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    {card.salesData?.averagePrice && (
                                        <div className="flex items-center text-xs text-green-600 font-semibold">
                                            <DollarSign className="h-3 w-3" />
                                            ${card.salesData.averagePrice} avg
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(card.timestamp, { addSuffix: true })}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
