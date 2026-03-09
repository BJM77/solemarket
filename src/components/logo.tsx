import Image from 'next/image';
import { cn } from '@/lib/utils';
import { brandConfig } from '@/config/brand';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center", className)}>
            <Image
                src={brandConfig.branding.logoUrl || '/benched.png'}
                alt={`${brandConfig.company.name} Logo`}
                width={422}
                height={193}
                className="w-auto h-full object-contain"
                priority
            />
        </div>
    );
}
