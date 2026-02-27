
'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Product, UserProfile, Review } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Mail, ShieldCheck, ShoppingBag, MessageSquare, Info } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import ReviewList from '@/components/reviews/ReviewList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatPrice, cn } from '@/lib/utils';
import { Phone } from 'lucide-react'; // Import Phone icon
import { safeDate } from '@/lib/date-utils';

// Define types
interface Seller extends UserProfile {
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
  responseTime?: string;
  joinDate?: string;
  description?: string;
}

function SellerProfileSkeleton() {
  return (
    <div className="container py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Skeleton className="h-28 w-28 rounded-full mb-4" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-10 w-full max-w-sm mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square h-48 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerPage() {
  const pathname = usePathname();
  const router = useRouter();
  const sellerId = pathname.split('/').pop() || '';
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);


  const { firestore } = useFirebase();
  const { user } = useUser();

  const sellerRef = useMemoFirebase(() => sellerId ? doc(db, 'users', sellerId) : null, [sellerId]);
  const { data: seller, isLoading: loadingSeller } = useDoc<Seller>(sellerRef);

  const reviewsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(
      collection(firestore, 'reviews'),
      where('sellerId', '==', sellerId)
    );
  }, [firestore, sellerId]);
  const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(
      collection(db, 'products'),
      where('sellerId', '==', sellerId),
      where('status', '==', 'available')
    );
  }, [firestore, sellerId]);
  const { data: products, isLoading: loadingProducts } = useCollection<Product>(productsQuery);


  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  const handleStartConversation = async () => {
    if (!user || !seller) {
      if (!user) router.push(`/sign-in?redirect=/seller/${sellerId}`);
      return;
    }

    if (user.uid === seller.id) {
      toast({ title: "You can't message yourself.", variant: 'destructive' });
      return;
    }

    const conversationQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );

    const querySnapshot = await getDocs(conversationQuery);
    let existingConversation: any = null;

    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.participantIds.includes(seller.id)) {
        existingConversation = { id: doc.id, ...data };
      }
    });

    if (existingConversation) {
      router.push(`/messages/${existingConversation.id}`);
    } else {
      const newConversationRef = await addDoc(collection(db, 'conversations'), {
        participantIds: [user.uid, seller.id],
        participants: {
          [user.uid]: {
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          [seller.id]: {
            displayName: seller.displayName,
            photoURL: seller.photoURL,
          }
        },
        lastMessage: {
          text: `New conversation with ${seller.displayName}`,
          senderId: user.uid,
          timestamp: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
      });
      router.push(`/messages/${newConversationRef.id}`);
    }
  };

  if (loadingSeller || loadingProducts) return <SellerProfileSkeleton />;

  if (!seller) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold">Seller not found</h1>
        <p className="text-muted-foreground mt-2">The seller you are looking for does not exist.</p>
      </div>
    );
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'S';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const joinDate = seller.createdAt ? safeDate(seller.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6 text-center flex flex-col items-center">
                <Avatar className="h-28 w-28 mb-4 border-4 border-white shadow-md">
                  <AvatarImage src={seller.photoURL || ''} alt={seller.displayName || 'Seller'} />
                  <AvatarFallback className="text-4xl">{getInitials(seller.displayName)}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold font-headline">{seller.businessName || seller.displayName}</h1>
                {seller.businessName && <p className="text-sm font-medium text-gray-500">{seller.displayName}</p>}
                <p className="text-sm text-muted-foreground">Joined {joinDate}</p>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{typeof averageRating === 'number' ? averageRating.toFixed(1) : '0.0'}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">({reviews?.length || 0} reviews)</span>
                </div>

                {seller.isVerified && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-medium">Verified Seller</span>
                  </div>
                )}

                <Button className="w-full mt-6" onClick={handleStartConversation}>
                  <Mail className="mr-2 h-4 w-4" /> Message Seller
                </Button>
                {seller.phoneNumber && (
                  <Button
                    variant={isPhoneRevealed ? "secondary" : "outline"}
                    className={cn("w-full mt-2", isPhoneRevealed ? "bg-green-100 text-green-800 hover:bg-green-200" : "")}
                    onClick={() => setIsPhoneRevealed(true)}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    {isPhoneRevealed ? seller.phoneNumber : "Show Phone Number"}
                  </Button>
                )}
                {seller.bio && (
                  <div className="text-left w-full mt-6 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2 text-muted-foreground">About Me</h4>
                    <p className="text-sm text-gray-600">{seller.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="listings">
              <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="listings"><ShoppingBag className="w-4 h-4 mr-2" />Listings ({products?.length || 0})</TabsTrigger>
                <TabsTrigger value="reviews"><MessageSquare className="w-4 h-4 mr-2" />Reviews ({reviews?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="listings" className="mt-8">
                {products && products.length > 0 ? (
                  <ProductGrid products={products} />
                ) : (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">This seller has no active listings.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="reviews" className="mt-8">
                <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
