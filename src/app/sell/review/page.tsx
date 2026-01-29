'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Loader2, Package, Send, ArrowLeft, ShieldCheck, Check, Info } from 'lucide-react';
import type { Product } from '@/lib/types';
import { getDraftListing, publishListing } from '@/app/actions/sell';
import { useSearchParams } from 'next/navigation';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { formatPrice } from '@/lib/utils';

type ListingFormData = Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'sellerEmail' | 'sellerAvatar' | 'createdAt' | 'updatedAt' | 'views'> & {
  imageUrls: string[];
};

function ReviewPageSkeleton() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

function ReviewPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'publish' | 'draft' | null>(null);
  const [listingData, setListingData] = useState<ListingFormData | null>(null);

  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  useEffect(() => {
    if (!user || !draftId) return;

    const loadDraft = async () => {
      try {
        const data = await getDraftListing(draftId, user.uid);
        if (data) {
          setListingData(data);
        } else {
          router.replace('/sell/create');
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
        toast({ title: "Error loading draft", variant: "destructive" });
        router.replace('/sell/create');
      }
    };
    loadDraft();
  }, [user, draftId, router]);

  const handleSubmit = async (asDraft: boolean) => {
    if (!listingData || !draftId || !user) return;

    setSubmitAction(asDraft ? 'draft' : 'publish');
    setIsSubmitting(true);

    try {
      if (asDraft) {
        // It's already saved as a draft on creation/update
        toast({ title: 'Listing saved as a draft!' });
        router.push(`/sell/dashboard`);
      } else {
        // Publish
        await publishListing(draftId, user.uid);
        toast({ title: 'Listing Published Successfully!' });
        router.push(`/product/${draftId}`);
      }
    } catch (error: any) {
      console.error("Publish error:", error);
      toast({ title: 'Failed to publish listing', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (!listingData) {
    return <ReviewPageSkeleton />;
  }

  const { title, description, price, imageUrls, category, subCategory, condition, year, manufacturer, cardNumber, isVault } = listingData;

  return (
    <main className="flex-1 max-w-[960px] mx-auto w-full px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
        </Button>
      </div>

      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">Review Your Listing</h1>
        <p className="text-lg text-muted-foreground">This is how your listing will appear to buyers. Publish when you're ready.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xl shadow-primary/5 border border-gray-100 dark:border-gray-800 mb-10">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 relative group">
            <div className="aspect-square bg-muted relative">
              <Image
                src={imageUrls[0]}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {imageUrls.length > 1 && (
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wider text-white shadow-sm border border-white/20">
                  + {imageUrls.length - 1} Photos
                </span>
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  PREVIEW
                </span>
                {isVault && (
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1 border border-emerald-200">
                    <ShieldCheck className="h-3 w-3" />
                    VAULT PROTECTED
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold mb-4 leading-tight">{title}</h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {condition && (
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Condition</p>
                    <p className="text-lg font-semibold">{condition}</p>
                  </div>
                )}
                {year && (
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Year</p>
                    <p className="text-lg font-semibold">{year}</p>
                  </div>
                )}
                {(category || subCategory) && (
                  <div className="p-3 bg-background rounded-lg border col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                    <p className="text-base font-semibold flex items-center gap-2">
                      {category} {subCategory && `/ ${subCategory}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Listing Price</p>
              <p className="text-4xl font-black text-primary">${formatPrice(price)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">Shipping &amp; Logistics</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Logistics</p>
                <p className="text-sm text-muted-foreground">Shipping and returns are managed between buyer and seller.</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-6 mt-10 border-t">
        <Button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="w-full sm:w-auto min-w-[240px] px-8 py-4 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 h-16">
          {isSubmitting && submitAction === 'publish' ? <Loader2 className="animate-spin" /> : <Send />}
          Publish Listing
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl h-16">
          {isSubmitting && submitAction === 'draft' ? <Loader2 className="animate-spin" /> : <Package />}
          Save as Draft
        </Button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">By publishing, you agree to Picksy's Seller Terms of Service and Privacy Policy.</p>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewPageSkeleton />}>
      <ReviewPageContent />
    </Suspense>
  );
}