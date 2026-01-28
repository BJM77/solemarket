
'use client';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';

export default function AdminProductsPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <InfiniteProductGrid
                pageTitle="Product Registry"
                pageDescription="Review, manage, and edit all product listings on the platform."
                isAdmin={true}
            />
        </motion.div>
    );
}
