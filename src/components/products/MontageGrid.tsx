'use client';

import type { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import EmptyState from '../ui/EmptyState';
import { Package } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MontageGridProps {
  products: Product[];
  lastProductRef?: (node: HTMLDivElement) => void;
}

import { useViewedProducts } from '@/context/ViewedProductsContext';
import { Eye, Trash2, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { useState } from 'react';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';

export default function MontageGrid({ products, lastProductRef }: MontageGridProps) {
  const { viewedProductIds } = useViewedProducts();
  const { user } = useUser();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

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
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2"
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
          >
            <Link href={`/product/${product.id}`} className="group block relative aspect-square w-full h-full overflow-hidden rounded-md">
              <Image
                src={product.imageUrls[0]}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, (max-width: 1024px) 12.5vw, 10vw"
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {hasViewed && (
                <div className="absolute top-1 left-1 z-10">
                  <div className="bg-black/50 text-white p-1 rounded-full backdrop-blur-sm">
                    <Eye className="h-3 w-3" />
                  </div>
                </div>
              )}

              {isSuperAdmin && (
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="absolute top-1 right-1 z-20 bg-red-600/80 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deletingId === product.id}
                >
                  {deletingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              )}

              <div className="absolute bottom-1 right-1">
                <span className="bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                  ${product.price.toFixed(0)}
                </span>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  );
}
