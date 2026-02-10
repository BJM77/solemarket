
'use client';

import type { Product } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import ProductImageGallery from './ProductImageGallery';
import { Heart, Share2, ShoppingCart, Edit, Eye, Search, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useState } from 'react';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { EbaySearchModal } from '@/components/admin/EbaySearchModal';

interface QuickViewProps {
  product: Product;
}

export function QuickView({ product }: QuickViewProps) {
  const { user } = useUser();
  const { addItem } = useCart();
  const { markAsViewed } = useViewedProducts();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const isOwner = user && user.uid === product.sellerId;
  const isSuperAdmin = user && ((user.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user.email && SUPER_ADMIN_EMAILS.includes(user.email)));
  const canEdit = isOwner || isSuperAdmin;


  const handleOpen = (openState: boolean) => {
    setIsOpen(openState);
    if (openState) {
      markAsViewed(product.id);
    }
  };

  const handleFavorite = () => {
    // This would eventually be a database action
    toast({
      title: "Added to Favorites!",
      description: `${product.title} has been added to your favorites list.`
    });
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/product/${product.id}`);
    toast({
      title: "Link Copied!",
      description: "A link to this product has been copied to your clipboard."
    });
  }

  const handleAddToCart = () => {
    addItem(product);
    toast({
      title: "Added to Cart!",
      description: `${product.title} is now in your cart.`
    });
    setIsOpen(false);
  }

  const getEbayQuery = () => {
    const parts = [];
    const title = product.title || '';
    const year = product.year?.toString() || '';
    const manufacturer = product.manufacturer || '';

    if (year && !title.startsWith(year)) parts.push(year);
    if (manufacturer && !title.toLowerCase().includes(manufacturer.toLowerCase())) parts.push(manufacturer);
    parts.push(title);
    return parts.join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <Eye className="mr-2 h-4 w-4" />
          Quick View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-auto md:h-[80vh] flex flex-col md:flex-row p-0">
        <DialogTitle className="sr-only">{`Quick view of ${product.title}`}</DialogTitle>
        <DialogDescription className="sr-only">{`View details for ${product.title}, add to cart, or see more.`}</DialogDescription>

        {/* Left Side: Image Gallery */}
        <div className="md:w-1/2 p-6 flex flex-col">
          <ProductImageGallery
            images={product.imageUrls}
            title={product.title}
            isCard={product.category === 'Collector Cards'}
          />
        </div>

        {/* Right Side: Product Details */}
        <div className="md:w-1/2 p-6 flex flex-col bg-gray-50/50 overflow-y-auto">

          <div className="space-y-3">
            <Badge variant="outline">{product.category}</Badge>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-headline">{product.title}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Sold by <Link href={`/seller/${product.sellerId}`} className="font-medium text-primary hover:underline">{product.sellerName}</Link>
              </p>
              {/* Star ratings could go here */}
            </div>
          </div>

          <Separator className="my-5" />

          <div className="space-y-4">
            <p className="text-3xl font-bold text-foreground">${formatPrice(product.price)}</p>

            <div className="text-sm text-muted-foreground">
              {product.description}
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Buy It
              </Button>
              <Button size="icon" variant="outline" onClick={handleFavorite}>
                <Heart className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="outline" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {isSuperAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-blue-600 border-blue-200 hover:bg-blue-50 gap-2"
                    asChild
                  >
                    <a
                      href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(getEbayQuery())}&LH_Sold=1&LH_Complete=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      eBay Sold
                    </a>
                  </Button>
                  <EbaySearchModal
                    defaultQuery={getEbayQuery()}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-blue-600 border-blue-200 hover:bg-blue-50 gap-2" title="Check eBay Prices (In-App)">
                        <Search className="h-4 w-4" />
                        eBay Check
                      </Button>
                    }
                  />
                </div>
              )}
              {canEdit && (
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/sell/edit/${product.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Listing
                  </Link>
                </Button>
              )}
            </div>
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/product/${product.id}`}>
                View Full Product Details →
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
