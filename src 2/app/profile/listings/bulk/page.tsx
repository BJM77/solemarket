'use client';

import BulkEditor from '@/components/products/BulkEditor';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function SellerBulkEditorPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/profile/listings/bulk');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!user) return null;

    return (
        <BulkEditor
            isAdmin={false}
            sellerId={user.uid}
            title="My Bulk Editor"
            description="Manage your listings in bulk."
        />
    );
}
