'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Loader2 } from 'lucide-react';
import Fuse from 'fuse.js';
import { getActiveProducts } from '@/lib/firebase/firestore';
import type { Product } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function InstantSearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Load products once when modal is first opened
  React.useEffect(() => {
    if (open && products.length === 0) {
      setLoading(true);
      // In a real app at scale, this should hit an API endpoint that returns a cached lite-version of products
      getActiveProducts(500).then(data => {
        setProducts(data);
        setLoading(false);
      }).catch(err => {
        console.error("Search fetch error", err);
        setLoading(false);
      });
    }
  }, [open, products.length]);

  const fuse = React.useMemo(() => {
    return new Fuse(products, {
      keys: ['title', 'brand', 'model', 'category'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [products]);

  const results = React.useMemo(() => {
    if (!query) return products.slice(0, 10);
    return fuse.search(query).map(r => r.item).slice(0, 10);
  }, [query, fuse, products]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (productId: string) => {
    onOpenChange(false);
    router.push(`/product/${productId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl bg-zinc-950 border-white/10 shadow-2xl rounded-xl">
        <Command 
          className="w-full bg-transparent flex flex-col overflow-hidden" 
          shouldFilter={false} // We use fuse.js instead of cmdk's built-in filtering
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query && results.length === 0) {
               // Fallback to browse page if no exact instant hits
               onOpenChange(false);
               router.push(`/browse?q=${encodeURIComponent(query)}`);
            }
          }}
        >
          <div className="flex items-center border-b border-white/5 px-3">
            <Search className="mr-2 h-5 w-5 shrink-0 text-zinc-500" />
            <Command.Input 
              value={query}
              onValueChange={setQuery}
              placeholder="Search sneakers, cards, coins..." 
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 text-white" 
            />
            {loading && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
          </div>
          
          <Command.List className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found. Press enter to search all listings.
            </Command.Empty>
            
            {results.length > 0 && (
              <Command.Group heading="Suggestions" className="text-xs font-medium text-zinc-500 px-2 py-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500">
                {results.map((product) => (
                  <Command.Item
                    key={product.id}
                    value={product.id}
                    onSelect={() => handleSelect(product.id)}
                    className="relative flex cursor-default select-none items-center rounded-lg px-2 py-3 text-sm outline-none aria-selected:bg-primary/20 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-primary/10 transition-colors text-white mb-1 gap-3"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-900">
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-zinc-800" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold truncate">{product.title}</span>
                      <span className="text-[10px] text-zinc-400 truncate">{product.category} • ${product.price}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
