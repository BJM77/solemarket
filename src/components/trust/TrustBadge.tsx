import React from 'react';
import { ShieldCheck, Trophy, Medal, Award } from 'lucide-react';
import { cn } from "@/lib/utils/ui";
import { getTrustTier } from '@/lib/trust/benched-score';

interface TrustBadgeProps {
    score: number;
    className?: string;
    showLabel?: boolean;
}

export function TrustBadge({ score, className, showLabel = true }: TrustBadgeProps) {
    const tier = getTrustTier(score);

    if (tier === 'Unrated') {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium", className)}>
                <ShieldCheck className="h-3.5 w-3.5 opacity-50" />
                {showLabel && <span>New Seller</span>}
            </div>
        );
    }

    let Icon = ShieldCheck;
    let colorClasses = "";
    
    switch (tier) {
        case 'Guaranteed Trust':
            Icon = Trophy;
            colorClasses = "bg-amber-500/20 text-amber-500 border border-amber-500/30";
            break;
        case 'Gold':
            Icon = Award;
            colorClasses = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30";
            break;
        case 'Silver':
            Icon = Medal;
            colorClasses = "bg-slate-300/20 text-slate-300 border border-slate-300/30";
            break;
        case 'Bronze':
            Icon = Medal;
            colorClasses = "bg-orange-700/20 text-orange-600 border border-orange-700/30";
            break;
    }

    return (
        <div 
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider", 
                colorClasses,
                className
            )}
            title={`Benched Trust Score: ${score}/100`}
        >
            <Icon className="h-3.5 w-3.5" />
            <span>{score}</span>
            {showLabel && <span className="ml-1 hidden sm:inline">{tier}</span>}
        </div>
    );
}
