'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            HOW TO <span className="text-primary">BUY</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Benched is a Peer-to-Peer marketplace. We prioritize direct communication between buyers and sellers to ensure the best deals and authenticity.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex gap-6 items-start">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <MessageSquare className="h-6 w-6 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">1. Message the Seller</h3>
              <p className="text-slate-400">
                Click the "Message" button on any product page to start a conversation. Ask about condition, extra photos, or negotiate the price.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex gap-6 items-start">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">2. Agree on Terms</h3>
              <p className="text-slate-400">
                Once you agree on a price, the seller will provide their preferred payment method (PayPal, Bank Transfer, etc.) and shipping details.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex gap-6 items-start">
            <div className="bg-primary/20 p-3 rounded-xl">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">3. Complete the Deal</h3>
              <p className="text-slate-400">
                After payment is confirmed, the seller ships the item. You can track your order status directly in your dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link href="/browse">
            <Button size="lg" className="rounded-full px-8 h-14 text-lg font-bold">
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
