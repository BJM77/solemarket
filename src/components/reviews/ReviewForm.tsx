
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SafeUser } from '@/lib/types';
import Link from 'next/link';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters long').max(1000),
});

interface ReviewFormProps {
  user: SafeUser;
  productId: string;
  productTitle: string;
  sellerId: string;
}

export default function ReviewForm({ user, productId, productTitle, sellerId }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false); // Add this state
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

   // Check if user has already reviewed this product
   useEffect(() => {
    if (!user) return;
    const checkReview = async () => {
        const q = query(
            collection(db, "reviews"),
            where("productId", "==", productId),
            where("buyerId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setHasReviewed(true);
        }
    };
    checkReview();
  }, [user, productId]);


  async function onSubmit(values: z.infer<typeof reviewSchema>) {
    if (!user) {
      toast({ title: 'You must be signed in to leave a review.', variant: 'destructive' });
      return;
    }
    
    // Check if the user is trying to review their own product
    if (user.uid === sellerId) {
      toast({ title: "You can't review your own product.", variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        ...values,
        productId,
        productTitle,
        sellerId,
        buyerId: user.uid,
        buyerName: user.displayName,
        buyerAvatar: user.photoURL,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Review submitted successfully!' });
      form.reset();
      setHasReviewed(true); // Set hasReviewed to true after submission
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Failed to submit review.',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="border rounded-lg p-6 text-center bg-gray-50">
        <p className="text-muted-foreground">
          <Button variant="link" asChild><Link href={`/sign-in?redirect=/product/${productId}`}>Sign in</Link></Button> to leave a review.
        </p>
      </div>
    );
  }
  
  if (hasReviewed) {
    return (
        <div className="border rounded-lg p-6 text-center bg-green-50 text-green-800">
            <p className="font-semibold">Thank you for your review!</p>
        </div>
    )
  }

  return (
    <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Your Rating</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                        key={star}
                        className={cn(
                            'h-8 w-8 cursor-pointer transition-colors',
                            (hoverRating >= star || field.value >= star)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => field.onChange(star)}
                        />
                    ))}
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Your Comment</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Tell us about your experience with this item and seller..."
                    rows={4}
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
            </Button>
        </form>
        </Form>
    </div>
  );
}
