
import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function AdminProductsPage() {
    return (
        <div className="min-h-screen">
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                {typeof InfiniteProductGrid !== 'undefined' ? (
                    <InfiniteProductGrid
                        pageTitle="Product Registry"
                        pageDescription="Review, manage, and edit all product listings on the platform."
                        isAdmin={true}
                        initialFilterState={{ status: 'available' }}
                    />
                ) : (
                    <div className="p-8 text-center text-muted-foreground">
                        Loading registry components...
                    </div>
                )}
            </Suspense>
        </div>
    );
}

