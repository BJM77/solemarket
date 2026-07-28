'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { brandConfig } from '@/config/brand';
import { useSiteConfig } from '@/providers/SiteConfigProvider';

export function Logo({ className }: { className?: string }) {
    const { config } = useSiteConfig();
    const siteLogo = config?.branding?.siteLogoUrl || brandConfig.branding.logoUrl || '/benchedlogo.png';

    return (
        <div className={cn("flex items-center", className)}>
            <Image
                src={siteLogo}
                alt={`${brandConfig.company.name} Logo`}
                width={422}
                height={193}
                className="w-auto h-full object-contain"
                priority
            />
        </div>
    );
}
