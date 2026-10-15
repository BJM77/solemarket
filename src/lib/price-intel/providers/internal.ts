/** Benched's own sold prices (orders that were paid / completed). Pure mapper + Firestore loader. */
import type { Comp, PriceQuery } from '../types';
import { titleSimilarity } from '../stats';

export const SOLD_ORDER_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'completed'];

export function mapInternalSales(orders: any[], q: PriceQuery): Comp[] {
    const out: Comp[] = [];
    for (const o of orders || []) {
        if (!SOLD_ORDER_STATUSES.includes(o.status)) continue;
        for (const it of o.items || []) {
            if (q.excludeProductId && it.id === q.excludeProductId) continue;
            if (titleSimilarity(q.query, it.title || '') < 0.6) continue;
            const price = Number(it.discountedPrice ?? it.price);
            if (!(price > 0)) continue;
            out.push({
                source: 'benched', kind: 'sold', title: it.title, price,
                url: `/product/${it.id}`,
                date: o.paidAt?.toDate?.()?.toISOString?.() || o.createdAt?.toDate?.()?.toISOString?.() || (typeof o.createdAt === 'string' ? o.createdAt : undefined),
            });
        }
    }
    return out;
}
