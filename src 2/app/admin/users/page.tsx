
import { Metadata } from 'next';
import UserManagementClient from '@/components/admin/users/UserManagementClient';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: 'User Management | Admin',
  description: 'Manage users, roles, and permissions.',
};

export default function UsersPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage accounts, assign roles (Seller, Store Owner, Admin), and monitor user status.</p>
        </div>
        <UserManagementClient />
    </div>
  );
}
