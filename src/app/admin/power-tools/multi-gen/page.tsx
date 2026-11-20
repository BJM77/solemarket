'use client';

import { MultiFastLister } from '@/components/admin/power-tools/MultiFastLister';

export default function MultiGenPage() {
    return (
        <MultiFastLister
            mode="gen"
            titleLabel="Fast Gen Lister"
            aspectRatio={16 / 9}
            aspectRatioStyle="aspect-video"
            captureWidth={1280}
            captureHeight={720}
            defaultCategory="General"
        />
    );
}
