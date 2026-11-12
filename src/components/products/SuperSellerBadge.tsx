
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/ui';

export function isSuperSeller(source: { abn?: string | null; sellerIsSuperSeller?: boolean } | null | undefined): boolean {
  if (!source) return false;
  if (source.sellerIsSuperSeller) return true;
  return Boolean(source.abn && String(source.abn).replace(/\D/g, '').length === 11);
}

export function SuperSellerBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900', className)}>
      Super Seller
    </Badge>
  );
}

export function BusinessSellerNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Business seller — Australian Consumer Law guarantees apply.
    </p>
  );
}
