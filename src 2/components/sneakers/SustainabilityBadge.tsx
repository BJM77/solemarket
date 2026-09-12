import { Leaf, Droplet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SustainabilityBadge({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
    if (variant === 'compact') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-300 dark:border-green-700">
                            <Leaf className="h-3 w-3 mr-1" />
                            Eco-Friendly
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Second-hand = ~14kg CO₂ saved</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                    <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        Shopping Second-Hand? You're Saving the Planet!
                    </h3>
                    <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
                        <div className="flex items-center gap-2">
                            <Leaf className="h-3 w-3" />
                            <span>~14kg CO₂ emissions prevented</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Droplet className="h-3 w-3" />
                            <span>Thousands of liters of water saved</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
