'use client';

import { useState } from 'react';
import { ShoppingCart, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { searchEbaySoldListings } from '@/app/actions/ebay';
import { EbaySearchResult } from '@/types/priget';

export default function ResearchPage() {
    // eBay Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<EbaySearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const { toast } = useToast();

    const handlePriceSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setSearchResults([]);

        try {
            const results = await searchEbaySoldListings(searchQuery);
            setSearchResults(results);
            
            if (results.length === 0) {
                toast({
                    title: "No Results",
                    description: "No recent sold listings found. The market research tool may be in maintenance or configuration is missing.",
                    variant: "default"
                });
            }
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

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="Market Research"
                description="Search sold listings to determine market value for your sneakers and trading cards."
            />

            <div className="mt-8">
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
                                placeholder="e.g. Jordan 1 High Chicago Lost and Found"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isSearching}>
                                {isSearching ? "Searching..." : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Search
                                    </>
                                )}
                            </Button>
                        </form>

                        {hasSearched && !isSearching && searchResults.length > 0 && (
                            <div className="flex justify-between items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="text-sm text-blue-800">
                                    <strong>Pro Tip:</strong> API results show recent matches. For 100% of historical sold data, check eBay directly.
                                </div>
                                <Button variant="outline" size="sm" className="bg-white" asChild>
                                    <a 
                                        href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Sold=1&LH_Complete=1`} 
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
                                                <Search className="w-8 h-8 opacity-20" />
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
            </div>
        </div>
    );
}
