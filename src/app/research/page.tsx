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
        <div className="min-h-screen bg-black text-white">
            <div className="container mx-auto py-12 px-4">
                <PageHeader
                    title="Market Research"
                    description="Search recently sold listings to determine the true market value for your collection."
                />

                <div className="mt-12 max-w-5xl mx-auto">
                    <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5 p-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/20 text-primary p-4 rounded-2xl shadow-inner border border-primary/10">
                                    <ShoppingCart className="w-8 h-8" />
                                </div>
                                <div className="text-left">
                                    <CardTitle className="text-2xl font-black italic">eBay Market Data</CardTitle>
                                    <CardDescription className="text-slate-400">Search Australian sales history to calculate fair market price.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handlePriceSearch} className="flex flex-col sm:flex-row gap-4 mb-10">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="e.g. Jordan 1 High Chicago Lost and Found"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary focus:border-primary text-lg"
                                    />
                                </div>
                                <Button type="submit" disabled={isSearching} size="lg" className="h-14 px-10 text-lg font-black italic rounded-xl shadow-lg shadow-primary/20">
                                    {isSearching ? "Analysing..." : "Fetch Deals"}
                                </Button>
                            </form>

                            {hasSearched && !isSearching && searchResults.length > 0 && (
                                <div className="flex flex-col md:flex-row justify-between items-center mb-10 p-6 bg-primary/10 rounded-2xl border border-primary/20 gap-4">
                                    <div className="text-sm text-slate-300">
                                        <strong className="text-primary uppercase tracking-wider text-xs block mb-1">Market Insight</strong>
                                        Showing real-time API matches. For 100% historical deep-dives, check eBay's official Sold archive.
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 whitespace-nowrap" asChild>
                                        <a
                                            href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Sold=1&LH_Complete=1`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Deep Research on eBay
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {hasSearched && searchResults.length === 0 && !isSearching && (
                                <div className="text-center text-slate-500 py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <Search className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                    <p className="text-xl">No verified sales found for "<span className="text-white italic">{searchQuery}</span>"</p>
                                    <p className="text-sm mt-2">Try adjusting your keywords or search directly on eBay.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                                {searchResults.map((item, index) => (
                                    <div key={index} className="group flex gap-6 p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all duration-300 transform hover:-translate-y-1">
                                        <div className="w-28 h-28 bg-slate-800 rounded-xl flex-shrink-0 overflow-hidden border border-white/5 shadow-inner">
                                            {item.image ? (
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                    <Search className="w-10 h-10 opacity-20" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:text-primary transition-colors line-clamp-1 mb-2">
                                                {item.title}
                                            </a>
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="text-sm text-slate-400 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    Sold: {new Date(item.soldDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-sm text-slate-400 flex items-center gap-1.5">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Verified Sale
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-lg font-black bg-white text-black italic">
                                                    ${item.price.toFixed(2)} <span className="text-[10px] ml-1 not-italic font-bold">AUD</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="self-center hidden sm:block">
                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" asChild>
                                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
