'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, ShieldCheck, ChevronRight, MessageSquare, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';

interface SellerCardProps {
  seller: UserProfile;
  isPhoneRevealed: boolean;
  onStartConversation: () => void;
  onRevealPhone: () => void;
  sellerShopId: string;
}

export function SellerCard({
  seller,
  isPhoneRevealed,
  onStartConversation,
  onRevealPhone,
  sellerShopId
}: SellerCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12 border border-white/10">
            <AvatarImage src={seller.photoURL || ''} />
            <AvatarFallback>{seller.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-black uppercase tracking-tight text-white flex items-center gap-1">
              {seller.displayName}
              {seller.isVerified && <ShieldCheck className="h-4 w-4 text-blue-500" />}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold text-white">{typeof seller.rating === 'number' ? seller.rating.toFixed(1) : 'N/A'}</span>
                <span className="text-xs text-muted-foreground">({seller.totalSales || 0} sales)</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/seller/${sellerShopId}`}>
              View Shop <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onStartConversation}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          {seller.phoneNumber && (
            <Button
              variant={isPhoneRevealed ? "secondary" : "default"}
              size="sm"
              onClick={onRevealPhone}
              className={cn(isPhoneRevealed ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "")}
            >
              <Phone className="h-4 w-4 mr-2" />
              {isPhoneRevealed ? seller.phoneNumber : "Show Phone"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
