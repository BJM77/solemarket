import Image from 'next/image';
import { cn } from '@/lib/utils';
import { brandConfig } from '@/config/brand';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Image
                src={brandConfig.branding.logoUrl || '/new-logo.png'}
                alt={`${brandConfig.company.name} Logo`}
                width={120}
                height={36}
                className="h-9 w-auto dark:invert"
                priority
            />
        </div>
    );
}
