
import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function AdminProductsPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                <InfiniteProductGrid
                    pageTitle="Product Registry"
                    pageDescription="Review, manage, and edit all product listings on the platform."
                    isAdmin={true}
                    initialFilterState={{ status: 'available' }}
                />
            </Suspense>
        </motion.div>
    );
}

