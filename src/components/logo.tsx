'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils/ui";
import { brandConfig } from '@/config/brand';
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import { resolveSiteLogos } from '@/lib/branding/logos';

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
    const { config } = useSiteConfig();
    const { light, dark } = resolveSiteLogos(
        config?.branding?.siteLogoUrl || brandConfig.branding.logoUrl,
        config?.branding?.logoDarkUrl || brandConfig.branding.logoDarkUrl,
    );

    const imageClass = "w-auto h-full max-w-full object-contain";

    return (
        <div className={cn("flex items-center", className)}>
            <Image
                src={light}
                alt={`${brandConfig.company.name} Logo`}
                width={422}
                height={193}
                className={cn(imageClass, dark !== light && "dark:hidden")}
                sizes="(max-width: 767px) 160px, 200px"
                priority={priority}
            />
            {dark !== light && (
                <Image
                    src={dark}
                    alt={`${brandConfig.company.name} Logo`}
                    width={422}
                    height={193}
                    className={cn(imageClass, "hidden dark:block")}
                    sizes="(max-width: 767px) 160px, 200px"
                    priority={priority}
                />
            )}
        </div>
    );
}
