'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import { MobileNavContent } from './MobileNavContent';
import Link from 'next/link';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main site navigation</SheetDescription>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <Link href="/" onClick={() => setIsOpen(false)} aria-label="Back to homepage">
              <Image src="/benched.png" alt="Benched Logo" width={150} height={45} className="w-auto h-8" priority />
            </Link>
          </div>
          <MobileNavContent setIsOpen={setIsOpen} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
