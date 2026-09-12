
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const trends = [
  { name: "NBA Prizm Rookies", change: "+12.4%", volume: "$4.2M", color: "text-green-500" },
  { name: "Jordan Retro Highs", change: "+8.1%", volume: "$1.8M", color: "text-green-500" },
  { name: "NBA Top Shot", change: "-3.2%", volume: "$940K", color: "text-red-500" },
  { name: "Kobe Signature", change: "+22.7%", volume: "$12.5M", color: "text-green-500" },
];

export function MarketTrends() {
  return (
    <Card className="bg-white dark:bg-white/5 rounded-xl p-6 border border-[#e7ebf3] dark:border-white/10">
      <CardHeader className="flex flex-row items-center justify-between mb-6 p-0">
        <CardTitle className="font-black text-lg">Market Trends</CardTitle>
        <TrendingUp className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-5">
          {trends.map(trend => (
            <div key={trend.name} className="flex items-center justify-between group cursor-pointer">
              <div>
                <p className="text-sm font-bold">{trend.name}</p>
                <p className="text-[10px] text-gray-500 uppercase font-black">24h Volume</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${trend.color}`}>{trend.change}</p>
                <p className="text-[10px] text-gray-400">{trend.volume}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-6 text-xs font-black uppercase tracking-widest text-primary border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
            View Full Report
        </Button>
      </CardContent>
    </Card>
  );
}
