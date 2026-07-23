
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Boxes, Star } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Input } from "@/samcam/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/samcam/components/ui/card";
import { ScanHistoryItem } from "@/samcam/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/samcam/components/ui/dialog";

export default function RarePage() {
  const [rareCollection, setRareCollection] = useState<ScanHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedHistory = localStorage.getItem("scanHistory");
    if (storedHistory) {
      const allItems: ScanHistoryItem[] = JSON.parse(storedHistory);
      const rareItems = allItems.filter(item => item.isRare);
      setRareCollection(rareItems);
    }
  }, []);

  const filteredCollection = useMemo(() => {
    return rareCollection.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rareCollection, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button variant="outline" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            My Rares
        </h1>
        <div className="w-10"></div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search your rare cards..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer" onClick={() => setSearchTerm('')}/>}
            </div>
          </CardContent>
        </Card>

        {filteredCollection.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollection.map(card => (
              <Dialog key={card.id}>
                <Card className="group overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                    <DialogTrigger asChild>
                      <div className="aspect-[3/4] relative cursor-pointer">
                        {card.imageDataUri ? (
                          <Image 
                            src={card.imageDataUri}
                            alt={`Image of ${card.name}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Boxes className="w-16 h-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                          <div className="absolute bottom-0 left-0 p-4 text-white w-full">
                              <h3 className="font-bold text-lg truncate">{card.name}</h3>
                              <div className="flex justify-between text-sm text-white/80">
                                  <span>{card.brand}</span>
                                  <span>{card.sport}</span>
                              </div>
                          </div>
                      </div>
                    </DialogTrigger>
                     <CardContent className="p-4 border-t">
                        <div className="flex items-center justify-between">
                            <Link href={`/card/${card.id}`} className="text-primary hover:underline font-semibold">
                                View Details
                            </Link>
                             {card.notes && <p className="text-sm text-muted-foreground line-clamp-1 italic">"{card.notes}"</p>}
                        </div>
                    </CardContent>
                </Card>
                 <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{card.name}</DialogTitle>
                  </DialogHeader>
                  <div className="relative aspect-[2.5/3.5] mx-auto w-full max-w-sm">
                     <Image
                      src={card.imageDataUri!}
                      alt={`Full size image of ${card.name}`}
                      fill
                      className="rounded-md object-contain"
                     />
                  </div>
                  <Button asChild className="mt-4">
                    <Link href={`/card/${card.id}`}>View Full Details</Link>
                  </Button>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg">
            <Star className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Rare Cards Yet</h3>
            <p className="text-sm text-muted-foreground">
              {rareCollection.length > 0 ? "Try adjusting your search term." : "Mark cards as 'Rare' on their detail page to add them here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
