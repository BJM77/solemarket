'use client';

import BulkEditor from '@/components/products/BulkEditor';

export default function BulkEditorPage() {
    return (
        <BulkEditor
            isAdmin={true}
            title="Admin Bulk Editor"
            description="Manage all listings on the platform."
        />
    );
}
