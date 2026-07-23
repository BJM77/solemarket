
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Settings, FileClock, Car, Loader, LogOut, Menu, BookCopy, Star, List, Download, ScanLine } from "lucide-react";
import Link from "next/link";
import HotWheelsScanner from "@/samcam/components/hotwheels-scanner";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { Button } from "@/samcam/components/ui/button";
import { useAuth } from "../auth-provider";
import { auth } from "@/samcam/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/samcam/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { useErrorLog } from "@/samcam/hooks/use-error-log";


export default function HotWheelsPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { errors, addError, clearErrors } = useErrorLog();


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
           <Car className="w-8 h-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold font-headline text-primary">Hot Wheels Scanner</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
             <div className="hidden md:flex items-center gap-2">
               <Button variant="outline" asChild>
                  <Link href="/">
                      <ScanLine className="w-4 h-4 mr-2" />
                      Card Scanner
                  </Link>
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                  <span className="sr-only">Open Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 <DropdownMenuItem asChild>
                    <Link href="/"><ScanLine className="w-4 h-4 mr-2" />Card Scanner</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/list"><List className="w-4 h-4 mr-2" />Keep List</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/rare"><Star className="w-4 h-4 mr-2" />My Rares</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/collection"><BookCopy className="w-4 h-4 mr-2" />My Collection</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                   <Link href="/export"><Download className="w-4 h-4 mr-2" />Export Data</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-6 h-6" />
                <span className="sr-only">Settings</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-6 h-6" />
              <span className="sr-only">Sign Out</span>
            </Button>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        <div className="w-full p-4 md:p-6 flex flex-col items-center gap-6">
            <div className="w-full text-center">
                <h2 className="text-xl font-bold font-headline">AI Scanner</h2>
                <p className="text-muted-foreground text-sm">Position a car in the frame and tap to scan.</p>
            </div>
            <HotWheelsScanner
              onError={addError}
            />
        </div>
      </main>

      <SettingsSheet
        isOpen={isSettingsOpen}
        setIsOpen={setIsSettingsOpen}
        errorLog={{ errors, clearErrors }}
      />
    </div>
  );
}
