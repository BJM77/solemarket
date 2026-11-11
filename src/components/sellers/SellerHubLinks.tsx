import Link from 'next/link';
import { OrderNotificationsToggle } from '@/components/seller/OrderNotificationsToggle';
import { PlusCircle, Layers, List, LayoutDashboard, Settings, BarChart3, Target } from 'lucide-react';

// Seller portal shortcuts. Lives at /sellers so it works on every storefront domain.
const LINKS = [
  { href: '/sell/create', label: 'List an item', desc: 'Basketball cards or sneakers', Icon: PlusCircle },
  { href: '/sell/fast-bulk', label: 'Fast Bulk upload', desc: 'Scan and publish many at once', Icon: Layers },
  { href: '/wtb', label: 'Buyer Wanted Board', desc: 'Fill open buyer requests for instant sales', Icon: Target },
  { href: '/seller/dashboard', label: 'Dashboard', desc: 'Orders, offers and messages', Icon: LayoutDashboard },
  { href: '/sell/analytics', label: 'Analytics', desc: 'Views and sales', Icon: BarChart3 },
  { href: '/sell/settings', label: 'Seller settings', desc: 'Payment terms, shipping and profile', Icon: Settings },
];

export function SellerHubLinks() {
  return (
    <section aria-labelledby="seller-hub-heading" className="mb-12" data-testid="seller-hub">
      <h2 id="seller-hub-heading" className="text-2xl font-bold font-headline mb-1">Seller Hub</h2>
      <p className="text-foreground/80 mb-5">Manage and upload your listings for every Benched storefront.</p>
      <div className="mb-4">
        <OrderNotificationsToggle compact />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map(({ href, label, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-orange-600 hover:shadow-md transition"
          >
            <Icon className="h-5 w-5 text-orange-700 shrink-0 mt-0.5" aria-hidden />
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">{label}</span>
              <span className="block text-sm text-foreground/75">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
