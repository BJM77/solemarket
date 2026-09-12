'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { db } from '@/lib/firebase/config';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, TrendingUp, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

export function SellerMiniDashboard() {
  const { user, isUserLoading } = useUser();

  const productsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, 'products'), where('sellerId', '==', user.uid));
  }, [user?.uid]);

  const ordersQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, 'orders'), where('sellerId', '==', user.uid));
  }, [user?.uid]);

  const { data: products, isLoading: productsLoading } = useCollection<any>(productsQuery);
  const { data: orders, isLoading: ordersLoading } = useCollection<any>(ordersQuery);

  const stats = useMemo(() => {
    if (!products || !orders) return { revenue: 0, activeCount: 0, orderCount: 0 };

    const activeCount = products.filter(p => p.status === 'available').length;
    const orderCount = orders.length;
    const revenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    return { revenue, activeCount, orderCount };
  }, [products, orders]);

  if (isUserLoading || productsLoading || ordersLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-none shadow-sm bg-slate-50 animate-pulse">
            <CardContent className="p-3 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Link href="/seller/dashboard" className="block">
        <Card className="border-none shadow-sm bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer group">
          <CardContent className="p-3 flex flex-col items-center justify-center text-center">
            <DollarSign className="h-4 w-4 text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-tighter">Sales</p>
            <p className="text-sm font-black text-orange-900">${formatPrice(stats.revenue)}</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/profile/listings" className="block">
        <Card className="border-none shadow-sm bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer group">
          <CardContent className="p-3 flex flex-col items-center justify-center text-center">
            <Package className="h-4 w-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter">Active</p>
            <p className="text-sm font-black text-blue-900">{stats.activeCount}</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/profile/orders" className="block">
        <Card className="border-none shadow-sm bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer group">
          <CardContent className="p-3 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-4 w-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tighter">Orders</p>
            <p className="text-sm font-black text-emerald-900">{stats.orderCount}</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
