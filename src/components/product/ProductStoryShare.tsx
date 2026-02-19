'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Instagram, Facebook, Link as LinkIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

interface ProductStoryShareProps {
  product: Product;
}

export function ProductStoryShare({ product }: ProductStoryShareProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : '';
  const shareText = `Check out this ${product.title} on Benched!`;

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Share to Story">
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Share to Story</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="relative aspect-[9/16] max-h-[400px] mx-auto overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
             <img 
                src={product.imageUrls[0]} 
                alt={product.title}
                className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <p className="text-white font-black text-lg leading-tight uppercase tracking-tight mb-1">{product.title}</p>
                    <p className="text-primary font-bold text-xl">${product.price}</p>
                    <div className="mt-2 inline-block bg-primary px-3 py-1 rounded-full">
                        <p className="text-[10px] text-white font-black uppercase tracking-widest">Available at Benched.au</p>
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={handleWebShare}>
                <Instagram className="h-6 w-6 text-pink-600" />
                <span className="text-[10px] font-bold uppercase">Instagram</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={handleWebShare}>
                <Facebook className="h-6 w-6 text-blue-600" />
                <span className="text-[10px] font-bold uppercase">Facebook</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-2xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={copyToClipboard}>
                {copied ? <Check className="h-6 w-6 text-green-600" /> : <LinkIcon className="h-6 w-6 text-gray-600" />}
                <span className="text-[10px] font-bold uppercase">{copied ? "Copied" : "Copy Link"}</span>
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest px-8">
            Screenshots of this preview work best for high-quality Instagram and Facebook stories.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
