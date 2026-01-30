'use client';

import { SellersTable } from "@/components/admin/sellers/SellersTable";

export default function SellersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sellers & Business Accounts</h1>
                <p className="text-muted-foreground">Manage seller profiles, business verification, and listing privileges.</p>
            </div>

            <SellersTable />
        </div>
    );
}
