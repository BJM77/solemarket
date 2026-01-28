'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { Settings, FileClock, ScanLine, Loader, ShoppingCart, Star, List } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ScanHistoryItem, Player } from '@/lib/research-types';
import { defaultPlayers } from '@/lib/research-types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorBoundary } from 'react-error-boundary';
import { getResearchPreferences, addPlayerToKeepList, getScanHistory, addScanResult, deleteScanResult } from '@/app/actions/research';

const CameraScanner = dynamic(() => import('@/components/research/camera-scanner'), {
    loading: () => (
        <div className="w-full max-w-[12rem] aspect-[9/16] flex flex-col items-center justify-center bg-muted rounded-xl">
            <Loader className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading Camera...</p>
        </div>
    ),
    ssr: false,
});

// Fallback component for CameraScanner error boundary
function CameraScannerFallback({ error, resetErrorBoundary }: any) {
    return (
        <div className="w-full max-w-[12rem] aspect-[9/16] flex flex-col items-center justify-center bg-muted rounded-xl p-4">
            <div className="text-destructive mb-2 font-bold">Scan Failed</div>
            <p className="text-xs text-muted-foreground text-center mb-4">
                {error?.message || 'Unable to load scanner'}
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                Try Again
            </Button>
        </div>
    );
}

const HistoryLog = dynamic(() => import('@/components/research/history-log'), {
    ssr: false,
});

export default function ResearchPage() {
    const [namesToKeep, setNamesToKeep] = useState<Player[]>([]);
    const [history, setHistory] = useState<ScanHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/research');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                try {
                    const [prefs, hist] = await Promise.all([
                        getResearchPreferences(user.uid),
                        getScanHistory(user.uid)
                    ]);
                    setNamesToKeep(prefs);
                    setHistory(hist);
                } catch (error) {
                    console.error("Failed to load research data:", error);
                    toast({
                        title: "Error",
                        description: "Could not load your research data.",
                        variant: "destructive"
                    });
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [user, toast]);

    const handleAddPlayer = useCallback(async (player: Player) => {
        if (!user) return;

        // Optimistic update
        setNamesToKeep((prevNames) => {
            if (prevNames.some(p => p.name.toLowerCase() === player.name.toLowerCase())) {
                toast({
                    title: 'Already in List',
                    description: `"${player.name}" is already in your keep list.`,
                });
                return prevNames;
            }
            return [...prevNames, player].sort((a, b) => a.name.localeCompare(b.name));
        });

        try {
            await addPlayerToKeepList(user.uid, player);
            toast({
                title: 'Player Added',
                description: `"${player.name}" has been added to your keep list.`,
            });
        } catch (error) {
            console.error("Failed to add player:", error);
            toast({
                title: "Error",
                description: "Failed to save player to server.",
                variant: "destructive"
            });
            // Revert logic could go here if needed
        }
    }, [user, toast]);

    const handleAddNameToKeep = useCallback((name: string, sport: string = 'Uncategorized') => {
        const newPlayer: Player = { name, sport: sport as Player['sport'] };
        handleAddPlayer(newPlayer);
    }, [handleAddPlayer]);

    const handleScanComplete = useCallback(
        async (result: {
            name: string;
            isKeeper: boolean;
            imageDataUri: string;
            brand?: string;
            cardType?: string;
            sport?: string;
            cardYear?: number | null;
            isPrizmRookie?: boolean;
            salesData?: {
                averagePrice?: number | null;
                salesCount?: number | null;
                source?: string | null;
            };
        }) => {
            if (!user) return;

            const newItem: ScanHistoryItem = {
                id: nanoid(),
                name: result.name,
                isKeeper: result.isKeeper,
                isPrizmRookie: result.isPrizmRookie,
                brand: result.brand,
                cardType: result.cardType,
                sport: result.sport,
                cardYear: result.cardYear,
                salesData: result.salesData,
                timestamp: new Date(),
                imageDataUri: result.imageDataUri, // We might want to upload this to storage in a real app
            };

            // Optimistic update
            setHistory(prev => [newItem, ...prev]);

            try {
                await addScanResult(user.uid, newItem);
            } catch (error) {
                console.error("Failed to save scan result:", error);
                toast({
                    title: "Warning",
                    description: "Scan saved locally but failed to sync to server.",
                    variant: "destructive"
                });
            }
        },
        [user, toast]
    );

    const handleDeleteItem = useCallback(async (id: string) => {
        if (!user) return;

        // Optimistic
        setHistory(prev => prev.filter(item => item.id !== id));

        try {
            await deleteScanResult(user.uid, id);
        } catch (error) {
            console.error("Failed to delete history item:", error);
            toast({
                title: "Error",
                description: "Failed to delete item from server.",
                variant: "destructive"
            });
            // Could revert here by reloading history
            const hist = await getScanHistory(user.uid);
            setHistory(hist);
        }
    }, [user, toast]);

    if (isUserLoading || isLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="Card Research Lab"
                description="Scan trading cards with AI to identify players, check values, and add to your marketplace listings"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Scanner Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <ScanLine className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle>AI Card Scanner</CardTitle>
                                <CardDescription>Position card in frame and tap to scan</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <ErrorBoundary FallbackComponent={CameraScannerFallback}>
                            <CameraScanner
                                playersToKeep={namesToKeep}
                                onScanComplete={handleScanComplete}
                                onAddNameToKeep={handleAddNameToKeep}
                            />
                        </ErrorBoundary>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" asChild size="sm">
                                <Link href="/research/keep-list">
                                    <List className="w-4 h-4 mr-2" />
                                    Keep List ({namesToKeep.length})
                                </Link>
                            </Button>
                            <Button variant="outline" asChild size="sm">
                                <Link href="/research/collection">
                                    <Star className="w-4 h-4 mr-2" />
                                    My Collection
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* History Section */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <FileClock className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle>Scan History</CardTitle>
                                <CardDescription>Review your recent scans</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <HistoryLog
                            history={history}
                            onDeleteItem={handleDeleteItem}
                            onAddNameToKeep={handleAddNameToKeep}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
