'use client';

import { MultiFastLister } from '@/components/admin/power-tools/MultiFastLister';

export default function MultiCardPage() {
    return (
        <MultiFastLister
            mode="card"
            titleLabel="Fast Card Lister"
            aspectRatio={5 / 7}
            aspectRatioStyle="aspect-[5/7]"
            captureWidth={1000}
            captureHeight={1400}
            defaultCategory="Collectibles"
        />
    );
}
