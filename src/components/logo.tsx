import Image from 'next/image';
import { cn } from '@/lib/utils';
import { brandConfig } from '@/config/brand';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Image
                src={brandConfig.branding.logoUrl || '/shoe.png'}
                alt={`${brandConfig.company.name} Logo`}
                width={180}
                height={54}
                className="w-auto h-auto"
                priority
            />
        </div>
    );
}
