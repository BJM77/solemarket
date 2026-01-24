'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PriceLookupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  searchParams?: {
    title?: string;
    year?: number;
  };
  onPriceSelect?: (price: number) => void;
}

export function EbayPriceLookup({ 
  isOpen, 
  onClose, 
  searchParams = {},
}: PriceLookupPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { title, year } = searchParams;

  useEffect(() => {
    if (isOpen) {
      const parts = [];
      if (year) parts.push(year.toString());
      if (title) parts.push(title);
      const newQuery = parts.join(' ').trim();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(prev => prev !== newQuery ? newQuery : prev);
    }
  }, [isOpen, title, year]);

  const handleSearchClick = () => {
    if (!searchQuery) return;
    // Construct eBay URL for "sold" items
    // _nkw: search query
    // LH_Sold=1: Sold items
    // LH_Complete=1: Completed listings (usually goes with Sold)
    const encodedQuery = encodeURIComponent(searchQuery);
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_ipg=60`;
    window.open(ebayUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Research Sold Prices</DialogTitle>
          <DialogDescription>
             Search for similar sold items on eBay to determine a competitive price.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 my-4">
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. 1999 Pokemon Charizard"
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
          />
        </div>

        <DialogFooter className="sm:justify-start">
           <Button type="button" onClick={handleSearchClick} className="w-full sm:w-auto">
              <ExternalLink className="mr-2 h-4 w-4" />
              Search Sold Items on eBay
           </Button>
           <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto mt-2 sm:mt-0">
             Close
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}