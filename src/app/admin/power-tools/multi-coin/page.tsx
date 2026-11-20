'use client';

import { MultiFastLister } from '@/components/admin/power-tools/MultiFastLister';

export default function MultiCoinPage() {
    return (
        <MultiFastLister
            mode="coin"
            titleLabel="Fast Coin Lister"
            aspectRatio={1 / 1}
            aspectRatioStyle="aspect-square"
            captureWidth={1000}
            captureHeight={1000}
            defaultCategory="Coins"
        />
    );
}
