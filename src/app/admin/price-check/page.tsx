import type { Metadata } from 'next';
import AdminPriceCheckClient from './AdminPriceCheckClient';

export const metadata: Metadata = { title: 'Price Check', robots: { index: false, follow: false } };

export default function AdminPriceCheckPage() {
    return <AdminPriceCheckClient />;
}
