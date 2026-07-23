
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Palette, Building, Boxes, Shirt } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Input } from "@/samcam/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/samcam/components/ui/select";
import { Card, CardContent } from "@/samcam/components/ui/card";
import { ScanHistoryItem } from "@/samcam/lib/types";
import { cn } from "@/samcam/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/samcam/components/ui/dialog";

export default function CollectionPage() {
  const [collection, setCollection] = useState<ScanHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const storedHistory = localStorage.getItem("scanHistory");
    if (storedHistory) {
      const allItems: ScanHistoryItem[] = JSON.parse(storedHistory);
      // Filter for keepers that have an image
      const keeperItems = allItems.filter(item => item.isKeeper && item.imageDataUri);
      setCollection(keeperItems);
    }
  }, []);

  const uniqueBrands = useMemo(() => {
    const brands = new Set(collection.map(item => item.brand).filter(Boolean));
    return ["all", ...Array.from(brands).sort()] as string[];
  }, [collection]);
  
  const uniqueColors = useMemo(() => {
    const colors = new Set(collection.map(item => item.cardType).filter(Boolean));
    return ["all", ...Array.from(colors).sort()] as string[];
  }, [collection]);
  
  const uniqueSports = useMemo(() => {
    const sports = new Set(collection.map(item => item.sport).filter(Boolean));
    return ["all", ...Array.from(sports).sort()] as string[];
  }, [collection]);

  const filteredCollection = useMemo(() => {
    return collection.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const brandMatch = brandFilter === 'all' || item.brand === brandFilter;
      const colorMatch = colorFilter === 'all' || item.cardType === colorFilter;
      const sportMatch = sportFilter === 'all' || item.sport === sportFilter;
      return nameMatch && brandMatch && colorMatch && sportMatch;
    });
  }, [collection, searchTerm, brandFilter, colorFilter, sportFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button variant="outline" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary">My Collection</h1>
        <div className="w-10"></div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search by player name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer" onClick={() => setSearchTerm('')}/>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger>
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand === 'all' ? 'All Brands' : brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger>
                  <Palette className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by color" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueColors.map(color => (
                    <SelectItem key={color} value={color}>{color === 'all' ? 'All Colors' : color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger>
                  <Shirt className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by sport" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSports.map(sport => (
                    <SelectItem key={sport} value={sport}>{sport === 'all' ? 'All Sports' : sport}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredCollection.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredCollection.map(card => (
              <Dialog key={card.id}>
                <DialogTrigger asChild>
                  <div className="group aspect-[2.5/3.5] relative rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl border-2 border-transparent hover:border-primary cursor-pointer">
                    {card.imageDataUri && (
                      <Image 
                        src={card.imageDataUri}
                        alt={`Image of ${card.name}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-2 text-white w-full">
                      <p className="font-bold text-sm truncate">{card.name}</p>
                      <div className="flex justify-between text-xs text-white/80">
                        <span>{card.brand}</span>
                        <span>{card.sport}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center rounded-xl">
                      <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">View</p>
                    </div>
                  </div>
                </DialogTrigger>
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
            <Boxes className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Matching Cards</h3>
            <p className="text-sm text-muted-foreground">
              {collection.length > 0 ? "Try adjusting your search filters." : "Your collection is empty. Start scanning some keepers!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
