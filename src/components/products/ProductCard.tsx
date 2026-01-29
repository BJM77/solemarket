
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingCart, Eye, Trash2, Loader2, Clock, Users, Edit, MoreHorizontal, ShieldCheck, RefreshCw, Maximize2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { QuickView } from './QuickView';
import { Timestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { deleteProductByAdmin, renewProductByAdmin } from '@/app/actions/admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';


interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list' | 'compact' | 'montage';
  isAdmin?: boolean;
}

export default function ProductCard({ product, viewMode = 'grid', isAdmin = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const { viewedProductIds } = useViewedProducts();
  const router = useRouter();

  const hasViewed = viewedProductIds.includes(product.id);

  // Super admin check
  const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({
      title: 'Added to Cart!',
      description: `${product.title} is now in your cart.`,
    });
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSuperAdmin) return;
    setIsDeleting(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication session expired.");

      const result = await deleteProductByAdmin(product.id, idToken);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Product Deleted",
        description: result.message,
      });
      setIsDeleted(true); // Visually remove the card

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "An error occurred.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenew = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSuperAdmin) return;
    setIsRenewing(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication session expired.");

      const result = await renewProductByAdmin(product.id, idToken);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Listing Renewed",
        description: result.message,
      });

      router.refresh();
      // Force a soft refresh to show the updated date internally if needed, 
      // though user said keep it hidden.
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Renewal Failed",
        description: error.message || "An error occurred.",
      });
    } finally {
      setIsRenewing(false);
    }
  };


  const getFormattedDate = (dateValue: any) => {
    if (!dateValue) return '';

    // Handle both Firestore Timestamps and JS Date objects
    if (dateValue instanceof Timestamp) {
      return formatDistanceToNow(dateValue.toDate(), { addSuffix: true });
    }
    // Check for serialized Timestamp from server-side rendering
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return formatDistanceToNow(new Date(dateValue.seconds * 1000), { addSuffix: true });
    }
    // Handle standard JS Date object
    if (dateValue instanceof Date) {
      return formatDistanceToNow(dateValue, { addSuffix: true });
    }
    return '';
  }

  if (isDeleted) {
    return null; // Don't render the card if it has been deleted
  }

  if (viewMode === 'compact') {
    return (
      <div className="group relative flex items-center justify-between border-b border-gray-100 dark:border-white/5 py-2 px-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
          {product.status === 'sold' && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold flex-shrink-0">
              Sold
            </Badge>
          )}
          <Link
            href={`/product/${product.id}`}
            className="text-sm font-semibold truncate hover:text-primary transition-colors"
          >
            {product.title}
          </Link>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded flex-shrink-0">
            {product.category}
          </span>
          {product.grade && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
              {product.grade}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                  onClick={handleRenew}
                  disabled={isRenewing}
                >
                  {isRenewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/sell/create?edit=${product.id}`}>
                    <Edit className="h-3 w-3" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600 hover:bg-red-50"
                  onClick={() => setIsDeleting(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            <span className="text-sm font-bold w-20 text-right">
              ${formatPrice(product.price)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart(e);
              }}
            >
              Buy
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="group relative flex flex-col sm:flex-row gap-4 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="relative w-full sm:w-48 flex-shrink-0 aspect-square bg-muted">
          {product.imageUrls?.[0] ? (
            <Link href={`/product/${product.id}`} className="block w-full h-full">
              <Image
                src={product.imageUrls[0]}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
              />
            </Link>
          ) : null}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            {product.isVault && (
              <Badge
                variant="default"
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-md cursor-pointer z-20 pointer-events-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open('/vault', '_blank');
                }}
              >
                <ShieldCheck className="h-3 w-3" />
                Vault
              </Badge>
            )}
            {hasViewed && (
              <Badge variant="secondary" className="inline-flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                Viewed
              </Badge>
            )}
            {product.status === 'sold' && (
              <Badge variant="destructive">
                Sold
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2 z-20">
            {isSuperAdmin && (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 border-none">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/sell/create?edit=${product.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Listing
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleting(true); }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Listing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{product.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 flex flex-col justify-between flex-grow">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-xs relative z-20">{product.category}</Badge>
              <p className="text-lg font-bold relative z-20">${formatPrice(product.price)}</p>
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary leading-tight">
              <Link
                href={`/product/${product.id}`}
                className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm after:absolute after:inset-0 after:z-0"
              >
                {product.title}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 relative z-20">
              {product.description}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0" title="Edit">
                <Link href={`/sell/create?edit=${product.id}`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-blue-600 border-blue-100 hover:bg-blue-50"
                onClick={handleRenew}
                disabled={isRenewing}
                title="Renew Listing"
              >
                {isRenewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 border-red-100 hover:bg-red-50"
                onClick={() => setIsDeleting(true)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid View (default) - new style
  return (
    <div className="group relative flex flex-col bg-white dark:bg-white/5 rounded-xl overflow-hidden border border-transparent hover:border-primary/20 hover:shadow-2xl transition-all duration-300 h-full">
      <div className="aspect-[4/5] bg-gray-100 dark:bg-white/10 relative overflow-hidden">
        <div className="absolute top-3 left-3 z-20 flex gap-2 pointer-events-none">
          {product.isVault && (
            <Badge
              variant="default"
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg cursor-pointer z-20 pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open('/vault', '_blank');
              }}
            >
              <ShieldCheck className="h-3 w-3" />
              Vault
            </Badge>
          )}
          {hasViewed && (
            <Badge variant="secondary" className="inline-flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter backdrop-blur-sm">
              <Eye className="h-3 w-3" />
              Viewed
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3 z-20">
          {isSuperAdmin && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 border-none">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/sell/create?edit=${product.id}`}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Listing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleting(true); }} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Listing
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{product.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        {product.imageUrls?.[0] && (
          <Image
            src={product.imageUrls[0]}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 relative">
          <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors flex-1 pr-2">
            <Link
              href={`/product/${product.id}`}
              className="hover:underline focus:outline-none after:absolute after:inset-0 after:z-0"
            >
              {product.title}
            </Link>
          </h3>
          {product.grade && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-0.5 rounded relative z-20">{product.grade}</span>}
        </div>
        <div className="flex items-end justify-between mt-4 flex-grow">
          <div className="relative z-20">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Price</p>
            <p className="text-2xl font-black text-[#0d121b] dark:text-white tracking-tight">${formatPrice(product.price)}</p>
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all active:scale-95 relative z-20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddToCart(e);
            }}
          >
            Buy It
          </Button>
        </div>
        {isAdmin && (
          <div className="mt-4 pt-4 border-t flex items-center gap-3 relative z-20" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" size="sm" asChild className="h-9 flex-1 gap-2" title="Edit">
              <Link href={`/sell/create?edit=${product.id}`}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 text-blue-600"
              onClick={handleRenew}
              disabled={isRenewing}
              title="Renew Listing"
            >
              {isRenewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 text-red-600"
              onClick={() => setIsDeleting(true)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
