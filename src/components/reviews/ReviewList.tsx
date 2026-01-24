
'use client';

import { Review } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
}

function ReviewSkeleton() {
    return (
        <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    )
}

export default function ReviewList({ reviews, isLoading }: ReviewListProps) {
  if (isLoading) {
    return (
        <div className="space-y-6">
            <ReviewSkeleton />
            <ReviewSkeleton />
        </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold">No reviews yet</h3>
        <p>Be the first to share your thoughts on this item.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src={review.buyerAvatar} alt={review.buyerName || 'Reviewer'} />
                <AvatarFallback>{review.buyerName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{review.buyerName}</h4>
                  <span className="text-xs text-muted-foreground">
                    {review.createdAt && formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mt-3">{review.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
