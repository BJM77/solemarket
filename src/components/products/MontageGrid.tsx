'use client';

import type { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import EmptyState from '../ui/EmptyState';
import { Package, Eye, Trash2, Loader2, Edit, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser } from '@/firebase';
import { useState } from 'react';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { formatPrice, getProductUrl } from '@/lib/utils';

export interface MontageGridProps {
  products: Product[];
  lastProductRef?: (node: HTMLDivElement) => void;
  isAdmin?: boolean;
  onOpenPriceAssistant?: (product: Product) => void;
}

export default function MontageGrid({ products, lastProductRef, isAdmin = false, onOpenPriceAssistant }: MontageGridProps) {

  const { viewedProductIds } = useViewedProducts();
  const { user } = useUser();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));
  const canManage = isAdmin || isSuperAdmin;

  const handleDelete = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this product?")) return;

    setDeletingId(productId);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Auth error");

      const result = await deleteProductByAdmin(productId, idToken);

      if (result.success) {
        toast({ title: "Deleted", description: "Product removed." });
        // Note: The list won't auto-refresh unless we invalidate router or use realtime. 
        // Without router.refresh(), it stays until reload. 
        // For now, I'll rely on user reloading or navigation.
        // Actually, I can reload page: window.location.reload(); 
        // Or just letting it be is fine for now.
        window.location.reload();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!products || products.length === 0) {
    return <EmptyState
      icon={<Package className="h-12 w-12 text-muted-foreground" />}
      title="No Products Found"
      description="Try adjusting your search or filters to find what you're looking for."
    />;
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    >
      {products.map((product, index) => {
        const isLastElement = index === products.length - 1;
        const hasViewed = viewedProductIds.includes(product.id);

        return (
          <motion.div
            ref={isLastElement ? lastProductRef : null}
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.02 }}
            className="group relative aspect-square w-full h-full overflow-hidden rounded-md"
          >
            <Link href={getProductUrl(product)} className="absolute inset-0 z-10" title={product.title}>
              <span className="sr-only">View {product.title}</span>
            </Link>

            <Image
              src={product.imageUrls[0]}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, (max-width: 1024px) 12.5vw, 10vw"
              className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {hasViewed && (
              <div className="absolute top-1 left-1 z-10 pointer-events-none">
                <div className="bg-black/50 text-white p-1 rounded-full backdrop-blur-sm">
                  <Eye className="h-3 w-3" />
                </div>
              </div>
            )}

            {canManage && (
              <div className="absolute top-1 right-1 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isSuperAdmin && onOpenPriceAssistant && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 p-0 bg-white/80 hover:bg-white text-indigo-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenPriceAssistant(product);
                    }}
                    title="Price Assistant"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 p-0 bg-white/80 hover:bg-white text-blue-600"
                  asChild
                >
                  <Link href={`/sell/create?edit=${product.id}`}>
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="bg-red-600/80 hover:bg-red-700 text-white p-1 rounded-md"
                  disabled={deletingId === product.id}
                >
                  {deletingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            )}

            <div className="absolute bottom-1 right-1 pointer-events-none">
              <span className="bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                ${formatPrice(product.price)}
              </span>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  );
}
