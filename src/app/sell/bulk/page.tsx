'use server';

import { BulkEditClient } from '@/components/scan/BulkEditClient';

export default async function BulkEditPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="container mx-auto px-4">
                <BulkEditClient />
            </div>
        </div>
    );
}
