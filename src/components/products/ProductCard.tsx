
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingCart, Eye, Trash2, Loader2, Clock, Users, Edit, MoreHorizontal, ShieldCheck, RefreshCw, Maximize2, Shield, TrendingUp } from 'lucide-react';
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
import { ProductImageLightbox } from './ProductImageLightbox';
import { updateProductPrice } from '@/app/actions/product-updates';
import { toggleProductHold } from '@/app/actions/admin';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X as XIcon } from "lucide-react";



interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list' | 'compact' | 'montage';
  isAdmin?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpenPriceAssistant?: (product: Product) => void;
}

export default function ProductCard({
  product,
  viewMode = 'grid',
  isAdmin = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  onOpenPriceAssistant
}: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { viewedProductIds } = useViewedProducts();

  const hasViewed = viewedProductIds.includes(product.id);

  // Price Editing State
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(product.price.toString());
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const handlePriceSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isAdmin) return;

    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid Price", variant: "destructive" });
      return;
    }

    setIsSavingPrice(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Auth required");
      const result = await updateProductPrice(product.id, newPrice, idToken);
      if (result.success) {
        toast({ title: "Price Updated" });
        setIsEditingPrice(false);
        product.price = newPrice; // Optimistic update
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingPrice(false);
    }
  };

  const PriceDisplay = () => {
    if (isEditingPrice) {
      return (
        <form onSubmit={handlePriceSave} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <Input
            type="number"
            value={editedPrice}
            onChange={(e) => setEditedPrice(e.target.value)}
            className="h-7 w-20 px-1 py-0 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" type="submit" disabled={isSavingPrice}>
            {isSavingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setIsEditingPrice(false)}>
            <XIcon className="h-4 w-4" />
          </Button>
        </form>
      );
    }

    return (
      <div
        className={cn("flex items-center gap-2", isAdmin && "cursor-pointer hover:bg-muted/50 p-1 rounded")}
        onClick={(e) => {
          if (isAdmin) {
            e.preventDefault();
            e.stopPropagation();
            setIsEditingPrice(true);
          }
        }}
        title={isAdmin ? "Click to edit price" : undefined}
      >
        ${formatPrice(product.price)}
        {isAdmin && <Edit className="h-3 w-3 opacity-20" />}
        {isSuperAdmin && onOpenPriceAssistant && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 ml-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 relative z-30"
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
      </div>
    );
  };


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

    if (!isSuperAdmin && !isAdmin) return;
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

    if (!isSuperAdmin && !isAdmin) return;
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

  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSuperAdmin && !isAdmin) return;
    setIsApproving(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication session expired.");

      const { approveProductByAdmin } = await import('@/app/actions/admin');
      const result = await approveProductByAdmin(product.id, idToken);

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Product Approved",
        description: result.message,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleToggleHold = async () => {
    if (!isAdmin) return;

    // If currently on hold, we are releasing it.
    // If available, we are placing on hold (requires reason).
    const isOnHold = product.status === 'on_hold';
    let reason = '';

    if (!isOnHold) {
      reason = window.prompt("Reason for placing on hold (Fraud, Wrong Product, etc.):") || '';
      if (!reason) return; // Cancelled
    }

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const result = await toggleProductHold(product.id, !isOnHold, reason, idToken);

      toast({
        title: result.success ? "Success" : "Error",
        description: result.success ? result.message : result.error,
        variant: result.success ? "default" : "destructive"
      });

      if (result.success) {
        router.refresh();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update hold status", variant: "destructive" });
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

  const getAspectRatio = (category: string) => {
    switch (category) {
      case 'Coins':
        return 'aspect-square';
      case 'Memorabilia':
      case 'Collectibles':
      case 'General':
        return 'aspect-video';
      case 'Collector Cards':
      default:
        return 'aspect-[5/7]';
    }
  };

  const imageAspectRatio = getAspectRatio(product.category);


  if (isDeleted) {
    return null; // Don't render the card if it has been deleted
  }

  if (viewMode === 'compact') {
    return (
      <div className="group relative flex items-center justify-between border-b border-gray-100 dark:border-white/5 py-2 px-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        {!selectable && (
          <Link
            href={`/product/${product.id}`}
            className="absolute inset-0 z-0"
            title={product.title}
          >
            <span className="sr-only">View {product.title}</span>
          </Link>
        )}
        <div className="relative z-10 flex items-center gap-3 overflow-hidden pointer-events-none">
          {product.status === 'sold' && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold flex-shrink-0 pointer-events-auto">
              Sold
            </Badge>
          )}
          <span
            className="text-sm font-semibold truncate hover:text-primary transition-colors pointer-events-auto"
          >
            {product.title}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded flex-shrink-0">
            {product.category}
          </span>
          {product.grade && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
              {product.grade}
            </span>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-4 flex-shrink-0">
          {selectable && (
            <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.()} className="mr-2 pointer-events-auto" />
          )}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-blue-600 hover:bg-blue-50"
                  onClick={handleRenew}
                  disabled={isRenewing}
                  title="Renew"
                >
                  {isRenewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-700 hover:bg-slate-100" asChild title="Edit">
                  <Link href={`/sell/create?edit=${product.id}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-600 hover:bg-red-50"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleting(true); }}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <span className="text-sm font-bold w-full text-right flex justify-end pointer-events-auto">
              <PriceDisplay />
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary hover:text-white pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart(e);
              }}
            >
              Buy
              <span className="sr-only"> now: {product.title} for ${formatPrice(product.price)}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="group relative flex flex-col sm:flex-row gap-4 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className={cn("relative w-full sm:w-48 flex-shrink-0 bg-muted", imageAspectRatio)}>
          {selectable && (
            <div className="absolute top-2 left-2 z-50">
              <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.()} className="bg-white" />
            </div>
          )}
          {product.imageUrls?.[0] ? (
            <div
              className="relative w-full h-full cursor-pointer group/image"
            >
              <Link href={`/product/${product.id}`} className="absolute inset-0 z-0" title={product.title}>
                <Image
                  src={product.imageUrls[0]}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover/image:scale-105"
                  sizes="(max-width: 640px) 100vw, 192px"
                  placeholder="blur"
                  blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
                />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 z-20 text-white bg-black/40 hover:bg-black/60 hidden group-hover/image:flex"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsLightboxOpen(true); }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
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
            {(isSuperAdmin || isAdmin) && (
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
        {!selectable && (
          <Link
            href={`/product/${product.id}`}
            className="absolute inset-0 z-0"
            title={product.title}
          >
            <span className="sr-only">View {product.title}</span>
          </Link>
        )}
        <div className="p-4 flex flex-col justify-between flex-grow relative z-10 pointer-events-none">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-xs pointer-events-auto">{product.category}</Badge>
              <div className="font-bold text-lg pointer-events-auto"><PriceDisplay /></div>
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary leading-tight">
              {product.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {product.description}
            </p>
          </div>
          {(isAdmin || isSuperAdmin) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
      </div >
    );
  }

  // Grid View (default) - new style
  return (
    <div className={cn(
      "group relative flex flex-col bg-white dark:bg-white/5 rounded-xl overflow-hidden border transition-all duration-300 h-full",
      selectable && selected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/20 hover:shadow-2xl"
    )} onClick={() => selectable && onToggleSelect?.()}>
      <div className={cn("bg-gray-100 dark:bg-white/10 relative overflow-hidden shrink-0", imageAspectRatio)}>

        {selectable && (
          <div className="absolute top-2 left-2 z-50 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.()} className="bg-white border-2 border-primary" />
          </div>
        )}

        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex gap-1 sm:gap-2 pointer-events-none scale-90 sm:scale-100 origin-top-left">
          {product.status === 'pending_approval' && (
            <Badge variant="outline" className="inline-flex items-center gap-1 bg-yellow-500/80 text-white border-none font-bold backdrop-blur-sm shadow-md pointer-events-auto">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Pending
            </Badge>
          )}
          {product.status === 'on_hold' && (
            <Badge variant="destructive" className="inline-flex items-center gap-1 font-bold backdrop-blur-sm shadow-md pointer-events-auto">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              On Hold
            </Badge>
          )}

          {product.isVault && (
            <Badge
              variant="default"
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-tighter shadow-lg cursor-pointer z-20 pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open('/vault', '_blank');
              }}
            >
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Vault
            </Badge>
          )}
          {hasViewed && (
            <Badge variant="secondary" className="inline-flex items-center gap-1 bg-black/50 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-tighter backdrop-blur-sm">
              <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Viewed
            </Badge>
          )}
        </div>
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 scale-90 sm:scale-100 origin-top-right">
          {(isSuperAdmin || isAdmin) && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/90 text-slate-700 hover:bg-white shadow-sm border border-slate-200" asChild title="Edit">
                  <Link href={`/sell/create?edit=${product.id}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/90 text-red-600 hover:bg-white shadow-sm border border-slate-200" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleting(true); }} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 border-none" aria-label="More options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/sell/create?edit=${product.id}`}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Listing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleHold(); }}>
                    <Shield className="mr-2 h-4 w-4" />
                    {product.status === 'on_hold' ? "Release Hold" : "Place on Hold"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleting(true); }} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Listing
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* ... dialog remains ... */}
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
          <Link
            href={`/product/${product.id}`}
            className="relative w-full h-full cursor-pointer overflow-hidden block"
            title={product.title}
          >
            <Image
              src={product.imageUrls[0]}
              alt={`Product image for ${product.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
            />
          </Link>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      {!selectable && (
        <Link
          href={`/product/${product.id}`}
          className="absolute inset-0 z-0"
          title={product.title}
        >
          <span className="sr-only">View {product.title}</span>
        </Link>
      )}
      <div className="p-3 sm:p-5 flex flex-col flex-grow relative z-10 pointer-events-none">
        <div className="flex justify-between items-start mb-1 sm:mb-2">
          <h3 className="text-sm sm:text-lg font-bold leading-tight group-hover:text-primary transition-colors flex-1 pr-1 sm:pr-2 line-clamp-2 min-h-[2.5rem] sm:min-h-0">
            {product.title}
          </h3>
          {product.grade && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded pointer-events-auto">{product.grade}</span>}
        </div>
        <div className="flex items-end justify-between mt-2 sm:mt-4 flex-grow">
          <div className="pointer-events-auto">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Price</p>
            <div className="text-lg sm:text-2xl font-black text-[#0d121b] dark:text-white tracking-tight">
              <PriceDisplay />
            </div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            {product.status === 'pending_approval' && isSuperAdmin ? (
              <Button
                size="sm"
                className="h-8 sm:h-10 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm transition-all active:scale-95"
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 sm:h-10 bg-primary hover:bg-primary/90 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm transition-all active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart(e);
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="mt-4 pt-4 border-t flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
      <ProductImageLightbox
        images={product.imageUrls}
        isOpen={isLightboxOpen}
        onOpenChange={setIsLightboxOpen}
        title={product.title}
      />
    </div >
  );
}

