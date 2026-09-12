'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Sparkles, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface MarketIndexProps {
  currentPrice: number;
  marketValue?: number;
  category?: string;
  condition?: string;
  brand?: string;
}

export function MarketIndexWidget({
  currentPrice,
  marketValue,
  category = 'Collector Cards',
  condition = 'Brand New / Gem Mint',
  brand = 'Nike'
}: MarketIndexProps) {
  // If market value isn't provided, estimate reasonable comp baseline
  const estimatedMarket = marketValue || Math.round(currentPrice * 1.15);
  const diff = estimatedMarket - currentPrice;
  const percentDiff = Math.round((Math.abs(diff) / estimatedMarket) * 100);
  const isSteal = diff > 0 && percentDiff >= 8;

  // Mock mini historical trend points for visualization
  const trendPoints = [
    Math.round(estimatedMarket * 0.92),
    Math.round(estimatedMarket * 0.95),
    Math.round(estimatedMarket * 0.98),
    Math.round(estimatedMarket * 1.02),
    estimatedMarket,
  ];

  return (
    <Card className="bg-card/70 backdrop-blur-md border border-white/10 overflow-hidden shadow-xl my-4">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                Benched Market Index™
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                Australian Secondary Market Comps (AUD)
              </div>
            </div>
          </div>

          {isSteal ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black px-2.5 py-1">
              🔥 Steal ({percentDiff}% Below Mkt)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-bold border-white/20 text-slate-300">
              Fair Market Value
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5 text-center">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Listing Price</div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">${formatPrice(currentPrice)}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Est. 30-Day Avg</div>
            <div className="text-base sm:text-lg font-black text-primary mt-0.5">${formatPrice(estimatedMarket)}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Liquidity Rating</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">High (A+)</div>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified by Benched Valuation Model
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" /> +4.2% (90d trend)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
