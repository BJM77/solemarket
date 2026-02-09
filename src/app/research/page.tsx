'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { Settings, FileClock, ScanLine, Loader, ShoppingCart, Star, List, Search, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScanHistoryItem, Player } from '@/lib/research-types';
import { defaultPlayers } from '@/lib/research-types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorBoundary } from 'react-error-boundary';
import { getResearchPreferences, addPlayerToKeepList, getScanHistory, addScanResult, deleteScanResult } from '@/app/actions/research';
import { searchEbaySoldListings } from '@/app/actions/ebay';
import { EbaySearchResult } from '@/types/priget';

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

    // eBay Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<EbaySearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

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
        } else {
            setIsLoading(false);
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
            const hist = await getScanHistory(user.uid);
            setHistory(hist);
        }
    }, [user, toast]);

    const handlePriceSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setSearchResults([]);

        try {
            const results = await searchEbaySoldListings(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            toast({
                title: "Search Failed",
                description: "Could not fetch sold listings from eBay.",
                variant: "destructive"
            });
        } finally {
            setIsSearching(false);
        }
    };

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
                description="Scan trading cards with AI or search sold listings to determine market value."
            />

            <Tabs defaultValue="price-check" className="mt-8 space-y-8">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="price-check">Price Check (eBay)</TabsTrigger>
                    <TabsTrigger value="scanner">AI Scanner</TabsTrigger>
                </TabsList>

                <TabsContent value="scanner" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                </TabsContent>

                <TabsContent value="price-check">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 text-green-700 p-3 rounded-full">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle>eBay Sold Listings</CardTitle>
                                    <CardDescription>Search recent sales to determine market price</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePriceSearch} className="flex gap-2 mb-6">
                                <Input
                                    placeholder="e.g. 1986 Fleer Michael Jordan PSA 8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit" disabled={isSearching}>
                                    {isSearching ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                    Search
                                </Button>
                            </form>

                            {hasSearched && !isSearching && (
                                <div className="flex justify-between items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-sm text-blue-800">
                                        <strong>Pro Tip:</strong> API results show recent matches. For 100% of historical sold data, check eBay directly.
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-white" asChild>
                                        <a 
                                            href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Sold=1&LH_Complete=1&mkcid=1&mkrid=705-53470-19255-0&siteid=15&campid=${process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || ''}&customid=picksy_research&toolid=10001&mkevt=1`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View All Sold on eBay
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {hasSearched && searchResults.length === 0 && !isSearching && (
                                <div className="text-center text-muted-foreground py-12">
                                    No sold listings found for "{searchQuery}"
                                </div>
                            )}

                            <div className="space-y-4">
                                {searchResults.map((item, index) => (
                                    <div key={index} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="w-24 h-24 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <ScanLine className="w-8 h-8 opacity-20" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline line-clamp-2 block mb-1">
                                                {item.title}
                                            </a>
                                            <div className="text-sm text-muted-foreground mb-2">
                                                Sold: {new Date(item.soldDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    ${item.price.toFixed(2)} AUD
                                                </span>
                                                {item.condition && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {item.condition}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
