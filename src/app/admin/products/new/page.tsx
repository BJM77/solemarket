'use client';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';

export default function NewListingsPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {typeof InfiniteProductGrid !== 'undefined' ? (
                <InfiniteProductGrid
                    pageTitle="New Listings"
                    pageDescription="View the latest listings, including those scheduled for future release."
                    isAdmin={true}
                    initialFilterState={{
                        status: 'available',
                        sort: 'createdAt-desc' // Ensure we see newest first
                    }}
                />
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    Loading component...
                </div>
            )}
        </motion.div>
    );
}
