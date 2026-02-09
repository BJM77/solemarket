
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { searchEbaySoldListings } from '@/app/actions/ebay';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EbaySearchModalProps {
    defaultQuery: string;
    trigger?: React.ReactNode;
}

export function EbaySearchModal({ defaultQuery, trigger }: EbaySearchModalProps) {
    const [query, setQuery] = useState(defaultQuery);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        setResults([]);

        try {
            const data = await searchEbaySoldListings(query);
            setResults(data);
        } catch (error) {
            console.error("eBay search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-search when opening if not searched yet
    const onOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && !hasSearched && query) {
            handleSearch();
        }
    };

    const averagePrice = results.length > 0
        ? results.reduce((acc, item) => acc + item.price, 0) / results.length
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Search eBay
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>eBay Price Check</DialogTitle>
                    <DialogDescription>
                        Search for sold listings to estimate market value.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 my-4">
                    <Input
                        value={query}
                        onChange={(e: any) => setQuery(e.target.value)}
                        placeholder="e.g. 1986 Fleer Michael Jordan PSA 8"
                        onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                {hasSearched && (
                    <div className="flex justify-between items-center mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm">
                            <span className="text-muted-foreground mr-2">Results:</span>
                            <span className="font-medium">{results.length} found</span>
                        </div>
                        {results.length > 0 && (
                            <div className="text-sm">
                                <span className="text-muted-foreground mr-2">Est. Average:</span>
                                <span className="font-bold text-green-600 text-lg">${formatPrice(averagePrice)}</span>
                            </div>
                        )}
                        <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                                href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="w-3 h-3 mr-2" />
                                View on eBay
                            </a>
                        </Button>
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p>Searching eBay...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 pb-4">
                            {results.map((item, index) => (
                                <div key={index} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0 relative">
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gray-100">
                                                <Search className="h-6 w-6 opacity-20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-medium text-sm line-clamp-2 hover:underline">
                                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                    {item.title}
                                                </a>
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.condition && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                                        {item.condition}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(item.soldDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between mt-2">
                                            <div className="font-bold text-lg text-gray-900">
                                                ${formatPrice(item.price)}
                                            </div>
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center"
                                            >
                                                View Listing <ExternalLink className="h-3 w-3 ml-1" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : hasSearched ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <AlertCircle className="h-10 w-10 mb-4 opacity-20" />
                            <p className="font-medium">No results found via API</p>
                            <p className="text-sm mt-1 max-w-xs text-center">
                                Try adjusting your search terms or verify specifically on eBay directly.
                            </p>
                            <Button variant="link" asChild className="mt-2">
                                <a
                                    href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Check eBay.com.au directly &rarr;
                                </a>
                            </Button>
                        </div>
                    ) : null}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
