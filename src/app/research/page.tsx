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

const CameraScanner = dynamic(() => import('@/components/research/camera-scanner'), {
    loading: () => (
        <div className="w-full max-w-[12rem] aspect-[9/16] flex flex-col items-center justify-center bg-muted rounded-xl">
            <Loader className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading Camera...</p>
        </div>
    ),
    ssr: false,
});

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
            const loadData = () => {
                // Load names to keep
                const storedNames = localStorage.getItem('namesToKeep');
                if (storedNames) {
                    try {
                        const parsedNames = JSON.parse(storedNames);
                        if (Array.isArray(parsedNames)) {
                            setNamesToKeep(parsedNames);
                        } else {
                            throw new Error('Stored names are not in the correct array format.');
                        }
                    } catch (error) {
                        console.error('Failed to parse namesToKeep from localStorage, falling back to default.', error);
                        setNamesToKeep(defaultPlayers);
                        localStorage.setItem('namesToKeep', JSON.stringify(defaultPlayers));
                    }
                } else {
                    setNamesToKeep(defaultPlayers);
                    localStorage.setItem('namesToKeep', JSON.stringify(defaultPlayers));
                }

                // Load scan history
                const storedHistory = localStorage.getItem('scanHistory');
                if (storedHistory) {
                    try {
                        const parsedHistory = JSON.parse(storedHistory).map((item: any) => ({
                            ...item,
                            timestamp: new Date(item.timestamp),
                        }));
                        setHistory(parsedHistory);
                    } catch (error) {
                        console.error('Failed to parse scanHistory from localStorage.', error);
                        setHistory([]);
                    }
                }

                setIsLoading(false);
            };
            loadData();
        }
    }, [user]);

    const handleAddPlayer = useCallback((player: Player) => {
        setNamesToKeep((prevNames) => {
            if (prevNames.some(p => p.name.toLowerCase() === player.name.toLowerCase())) {
                toast({
                    title: 'Already in List',
                    description: `"${player.name}" is already in your keep list.`,
                });
                return prevNames;
            }
            const newNames = [...prevNames, player].sort((a, b) => a.name.localeCompare(b.name));
            localStorage.setItem('namesToKeep', JSON.stringify(newNames));
            toast({
                title: 'Player Added',
                description: `"${player.name}" has been added to your keep list.`,
            });
            return newNames;
        });
    }, [toast]);

    const handleAddNameToKeep = useCallback((name: string, sport: string = 'Uncategorized') => {
        const newPlayer: Player = { name, sport: sport as Player['sport'] };
        handleAddPlayer(newPlayer);
    }, [handleAddPlayer]);

    const handleScanComplete = useCallback(
        (result: {
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
            setHistory((prevHistory) => {
                const playerAlreadyHasImage = prevHistory.some(
                    (item) => item.name === result.name && item.imageDataUri
                );

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
                    imageDataUri: result.isKeeper && !playerAlreadyHasImage ? result.imageDataUri : undefined,
                };
                const updatedHistory = [newItem, ...prevHistory].slice(0, 100);
                localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
        },
        []
    );

    const handleDeleteItem = useCallback((id: string) => {
        setHistory((prevHistory) => {
            const updatedHistory = prevHistory.filter((item) => item.id !== id);
            localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));
            return updatedHistory;
        });
    }, []);

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
                        <CameraScanner
                            playersToKeep={namesToKeep}
                            onScanComplete={handleScanComplete}
                            onAddNameToKeep={handleAddNameToKeep}
                        />
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
