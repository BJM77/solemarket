'use client';

import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { motion } from 'framer-motion';

export default function AdminApprovalsPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <InfiniteProductGrid
                pageTitle="Pending Approvals"
                pageDescription="Review and approve listings before they go live."
                initialFilterState={{
                    status: 'pending_approval',
                    sort: 'createdAt-desc'
                }}
                isAdmin={true}
            />
        </motion.div>
    );
}
