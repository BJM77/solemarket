import { Metadata } from 'next';
import MembersDirectoryClient from '@/components/admin/members/MembersDirectoryClient';

export const metadata: Metadata = {
    title: 'Members Directory | Admin',
    description: 'View all registered members and recently active accounts.',
};

export default function MembersDirectoryPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Members Directory</h1>
                <p className="text-muted-foreground">View all platform members and track recent login activity. Restricted to Super Admin access.</p>
            </div>
            <MembersDirectoryClient />
        </div>
    );
}
