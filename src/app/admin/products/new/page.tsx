'use client';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';

export default function NewListingsPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <InfiniteProductGrid
                pageTitle="New Listings"
                pageDescription="View the latest listings, including those scheduled for future release."
                isAdmin={true}
                initialFilterState={{
                    status: 'available',
                    sort: 'createdAt-desc' // Ensure we see newest first
                }}
            />
        </motion.div>
    );
}
