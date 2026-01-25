
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingCart, Eye, Trash2, Loader2, Clock, Users, Edit, MoreHorizontal, ShieldCheck } from 'lucide-react';
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
import { deleteProductByAdmin } from '@/app/actions/admin';
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


interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { viewedProductIds } = useViewedProducts();

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

  if (viewMode === 'list') {
    return (
      <Link href={`/product/${product.id}`} className="group block">
        <div className="flex flex-col sm:flex-row gap-4 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="relative w-full sm:w-48 flex-shrink-0 aspect-square bg-muted">
            {product.imageUrls?.[0] ? (
              <Image
                src={product.imageUrls[0]}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
              />
            ) : null}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {product.isVault && (
                <Badge 
                  variant="default" 
                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-md cursor-pointer z-20"
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
            <div className="absolute top-2 right-2 z-10">
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
            <div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs mb-1">{product.category}</Badge>
                <p className="text-lg font-bold">${product.price?.toLocaleString() || '0.00'}</p>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary leading-tight">
                {product.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {product.description}
              </p>
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={product.sellerAvatar} />
                  <AvatarFallback>{product.sellerName?.[0]}</AvatarFallback>
                </Avatar>
                <span>{product.sellerName}</span>
              </div>
              <span>{getFormattedDate(product.createdAt)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid View (default) - new style
  return (
    <div className="group relative flex flex-col bg-white dark:bg-white/5 rounded-xl overflow-hidden border border-transparent hover:border-primary/20 hover:shadow-2xl transition-all duration-300 h-full">
      <Link href={`/product/${product.id}`} className="contents">
        <div className="aspect-[4/5] bg-gray-100 dark:bg-white/10 relative overflow-hidden">
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            {product.isVault && (
              <Badge 
                variant="default" 
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg cursor-pointer z-20"
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
          <div className="absolute top-3 right-3 z-10">
            {isSuperAdmin && (
              <div onClick={(e) => e.preventDefault()}>
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
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors flex-1 pr-2">
              {product.title}
            </h3>
            {product.grade && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-0.5 rounded">{product.grade}</span>}
          </div>
          <div className="flex items-end justify-between mt-4 flex-grow">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Price</p>
              <p className="text-2xl font-black text-[#0d121b] dark:text-white tracking-tight">${product.price.toLocaleString()}</p>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all active:scale-95" onClick={(e) => { e.preventDefault(); handleAddToCart(e); }}>
              Buy It
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {getFormattedDate(product.createdAt)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {product.views || 0} views</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
