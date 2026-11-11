'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { formatCountdown, toMs } from '@/lib/checkout/holds';
import { cn } from '@/lib/utils/ui';

/** Live mm:ss countdown to a hold's expiry. Calls onExpire once when it hits zero. */
export function HoldCountdown({
    expiresAt,
    onExpire,
    label = 'Item held for you',
    className,
    compact = false,
}: {
    expiresAt: number | string | Date | null | undefined;
    onExpire?: () => void;
    label?: string;
    className?: string;
    compact?: boolean;
}) {
    const target = toMs(expiresAt as any);
    const [now, setNow] = useState(() => Date.now());
    const fired = useRef(false);

    useEffect(() => {
        if (!target) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [target]);

    const left = target ? target - now : 0;
    useEffect(() => {
        if (target && left <= 0 && !fired.current) {
            fired.current = true;
            onExpire?.();
        }
    }, [left, target, onExpire]);

    if (!target) return null;
    const urgent = left < 5 * 60_000;
    if (compact) {
        return <span className={cn('font-mono font-black tabular-nums', className)} data-testid="hold-countdown">{formatCountdown(left)}</span>;
    }
    return (
        <div
            role="timer"
            aria-live="off"
            className={cn(
                'flex items-center justify-between gap-3 rounded-xl border-2 p-4',
                urgent ? 'border-rose-500 bg-rose-500/10' : 'border-primary bg-primary/10',
                className,
            )}
        >
            <div className="flex items-center gap-2">
                <Timer className={cn('h-5 w-5', urgent ? 'text-rose-600' : 'text-primary')} aria-hidden />
                <span className="text-sm font-bold text-foreground">{left > 0 ? label : 'Hold expired'}</span>
            </div>
            <span className={cn('font-mono text-2xl font-black tabular-nums', urgent ? 'text-rose-600' : 'text-foreground')} data-testid="hold-countdown">
                {formatCountdown(left)}
            </span>
        </div>
    );
}
