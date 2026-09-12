'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, Suspense } from 'react';
import brandConfig from '@/config/brand';

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || brandConfig.integrations.analytics?.facebookPixelId;

function FacebookPixelInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!FB_PIXEL_ID) {
            return;
        }

        // @ts-ignore
        if (typeof window.fbq === 'function') {
            // @ts-ignore
            window.fbq('track', 'PageView');
        }
    }, [pathname, searchParams]);

    if (!FB_PIXEL_ID) {
        return null;
    }

    return (
        <>
            <Script
                id="fb-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
                }}
            />
        </>
    );
}

export function FacebookPixel() {
    return (
        <Suspense fallback={null}>
            <FacebookPixelInner />
        </Suspense>
    )
}
