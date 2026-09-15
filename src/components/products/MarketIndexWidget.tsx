'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, ExternalLink, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';

interface MarketIndexProps {
  currentPrice: number;
  marketValue?: number;
  marketData?: {
    sampleSize: number;
    comparables?: Array<{ title: string; price: number; link: string; date?: string }>;
    lastCheckedAt?: any;
    source?: string;
  };
  category?: string;
  condition?: string;
  brand?: string;
}

export function MarketIndexWidget({
  currentPrice,
  marketValue,
  marketData,
  category = 'Collector Cards',
}: MarketIndexProps) {
  // HARD GATE: No fabricated data. Ever.
  if (!marketValue || marketValue <= 0 || !marketData || marketData.sampleSize < 3) {
    return null; // Or render a "insufficient data" placeholder if you prefer
  }

  const diff = marketValue - currentPrice;
  const percentDiff = Math.round((diff / marketValue) * 100);
  const isSteal = diff > 0 && percentDiff >= 8;
  const isOverpriced = diff < 0 && Math.abs(percentDiff) >= 8;

  const lastChecked = marketData.lastCheckedAt?.toDate?.();
  const hoursAgo = lastChecked
    ? Math.round((Date.now() - lastChecked.getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <Card className="bg-card/70 backdrop-blur-md border border-white/10 overflow-hidden shadow-xl my-4">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                Market Index
              </div>
              <div className="text-[11px] text-muted-foreground">
                Based on {marketData.sampleSize} recent eBay AU sales
              </div>
            </div>
          </div>

          {isSteal && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black px-2.5 py-1">
              🔥 {percentDiff}% Below Mkt
            </Badge>
          )}
          {isOverpriced && (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black px-2.5 py-1">
              {Math.abs(percentDiff)}% Above Mkt
            </Badge>
          )}
          {!isSteal && !isOverpriced && (
            <Badge variant="outline" className="text-xs font-bold border-white/20 text-slate-300">
              Fair Market Value
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Listing Price</div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">${formatPrice(currentPrice)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Median Sold</div>
            <div className="text-base sm:text-lg font-black text-primary mt-0.5">${formatPrice(marketValue)}</div>
          </div>
        </div>

        {marketData.comparables && marketData.comparables.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">
              Recent Sales Evidence
            </div>
            <div className="space-y-1">
              {marketData.comparables.slice(0, 3).map((comp, i) => (
                <a
                  key={i}
                  href={comp.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs py-1 px-2 -mx-2 rounded hover:bg-white/5 group"
                >
                  <span className="truncate text-slate-300 group-hover:text-white max-w-[70%]">
                    {comp.title}
                  </span>
                  <span className="font-mono font-bold text-white shrink-0 ml-2">
                    ${formatPrice(comp.price)}
                    <ExternalLink className="inline h-3 w-3 ml-1 opacity-40" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 text-slate-400">
            <AlertCircle className="w-3.5 h-3.5" />
            Source: {marketData.source || 'eBay AU'}
          </span>
          {hoursAgo !== null && (
            <span>
              {hoursAgo < 1 ? 'Updated just now' : `Updated ${hoursAgo}h ago`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
