import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-2 text-primary", className)}>
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-[#0d121b] dark:text-white text-xl font-black leading-tight tracking-tight">Picksy</h2>
        </div>
    );
}
