'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils/ui";
import { brandConfig } from '@/config/brand';
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import { logoRenderPlan } from '@/lib/branding/logos';

const IMAGE_CLASS = "w-auto h-full max-w-full object-contain";
const SIZES = "(max-width: 767px) 160px, 200px";

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
    const { config } = useSiteConfig();
    const plan = logoRenderPlan(
        config?.branding?.siteLogoUrl || brandConfig.branding.logoUrl,
        config?.branding?.logoDarkUrl || brandConfig.branding.logoDarkUrl,
    );
    const alt = `${brandConfig.company.name} Logo`;

    return (
        <div className={cn("flex items-center", className)}>
            {plan.kind === 'single' ? (
                // Black wordmark on light backgrounds; the same file inverted (white) on dark ones.
                <Image
                    src={plan.src}
                    alt={alt}
                    width={422}
                    height={193}
                    className={cn(IMAGE_CLASS, plan.invertInDark && "dark:invert")}
                    sizes={SIZES}
                    priority={priority}
                />
            ) : (
                <>
                    <Image src={plan.light} alt={alt} width={422} height={193} className={cn(IMAGE_CLASS, "dark:hidden")} sizes={SIZES} priority={priority} />
                    {/* Not preloaded: only downloaded when dark mode actually shows it. */}
                    <Image src={plan.dark} alt={alt} width={422} height={193} className={cn(IMAGE_CLASS, "hidden dark:block")} sizes={SIZES} loading="lazy" />
                </>
            )}
        </div>
    );
}
