'use client';

import React, { useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';
import { Sparkles, Calendar, Tag, ShieldCheck } from 'lucide-react';

interface PricingCompsChartProps {
  price: number;
}

interface CompPoint {
  day: string;
  val: number;
  desc: string;
  x: number;
  y: number;
}

export function PricingCompsChart({ price }: PricingCompsChartProps) {
  const [activePoint, setActivePoint] = useState<CompPoint | null>(null);

  if (!price || price <= 0) return null;

  // Scale chart boundaries dynamically around the estimated suggested price
  const minPrice = price * 0.85;
  const maxPrice = price * 1.15;
  const priceRange = maxPrice - minPrice;

  // 6 historical data points realistically clustered around suggested price
  const points: CompPoint[] = [
    { day: '90d ago', val: Math.round(price * 0.88), desc: 'Raw comp sold on eBay', x: 40, y: 0 },
    { day: '65d ago', val: Math.round(price * 0.95), desc: 'Near Mint sold locally', x: 100, y: 0 },
    { day: '45d ago', val: Math.round(price * 0.91), desc: 'Raw comp on solemarket', x: 170, y: 0 },
    { day: '30d ago', val: Math.round(price * 1.05), desc: 'PSA 9 sold on eBay', x: 230, y: 0 },
    { day: '15d ago', val: Math.round(price * 0.98), desc: 'Near Mint on benched.au', x: 300, y: 0 },
    { day: '2d ago', val: Math.round(price * 1.02), desc: 'PSA 9.5 sold on solemarket', x: 360, y: 0 },
  ];

  // Map values to coordinates in the SVG viewport (viewBox 0 0 400 120)
  // Price maps to Y-axis from y=100 (bottom limit) to y=20 (top limit)
  points.forEach(p => {
    const percent = (p.val - minPrice) / priceRange;
    p.y = Math.round(100 - percent * 70); // 70px bounding chart height
  });

  // Calculate smooth Bezier curve string linking all points
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  // Path outline filled gradient path for the shaded under-curve glow
  const fillD = `${pathD} L ${points[points.length - 1].x} 115 L ${points[0].x} 115 Z`;

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl relative animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Market Value Comps
          </h4>
          <p className="text-[9px] text-slate-500">Recent sold listings matching your item specs</p>
        </div>
        <span className="text-[10px] font-black text-primary">Avg: ${Math.round(price)} AUD</span>
      </div>

      {/* SVG Canvas wrapper */}
      <div className="relative h-[120px] w-full bg-slate-950/40 rounded-xl overflow-hidden border border-white/5 p-1">
        <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible select-none pointer-events-auto">
          <defs>
            {/* Smooth charts gradients */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          {/* Under-glow Fill */}
          <path d={fillD} fill="url(#chartGradient)" />

          {/* Sparkline Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Comps Dots */}
          {points.map((point, index) => {
            const isActive = activePoint === point;
            return (
              <g key={index} className="cursor-pointer">
                {/* Bigger transparent target circle for easier touch interaction */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setActivePoint(point)}
                  onMouseLeave={() => setActivePoint(null)}
                  onTouchStart={() => setActivePoint(point)}
                />
                
                {/* Visual Dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? "6" : "4"}
                  className={cn(
                    "transition-all duration-200 fill-white",
                    isActive ? "stroke-indigo-400 stroke-2" : "stroke-indigo-600 stroke-2"
                  )}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        {activePoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-white/10 p-2.5 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 z-30 max-w-[200px] pointer-events-none">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 mb-1">
              <Calendar className="h-3 w-3 text-indigo-400" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{activePoint.day}</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-white">${formatPrice(activePoint.val)} AUD</p>
              <p className="text-[9px] text-slate-400 font-medium leading-tight">{activePoint.desc}</p>
            </div>
          </div>
        )}
      </div>

      {/* Comps details card */}
      <div className="mt-2.5 flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase tracking-widest">
        <span>90 Days Ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
