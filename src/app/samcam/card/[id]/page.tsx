
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader, Boxes, Palette, Building, CheckCircle, XCircle, Shirt, Trash2, Star, Save, ArrowRight, TrendingUp, Gem } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { auth } from "@/samcam/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/samcam/components/ui/card";
import { Badge } from "@/samcam/components/ui/badge";
import { ScanHistoryItem } from "@/samcam/lib/types";
import { cn } from "@/samcam/lib/utils";
import { useToast } from "@/samcam/hooks/use-toast";
import { Textarea } from "@/samcam/components/ui/textarea";
import { Label } from "@/samcam/components/ui/label";
import { Input } from "@/samcam/components/ui/input";
import { Switch } from "@/samcam/components/ui/switch";
import { compressImage } from "@/samcam/lib/image-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/samcam/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/samcam/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/samcam/components/ui/dialog"


const THUMBNAILS_PER_PAGE = 12;

export default function CardDetailPage() {
  const params = useParams();
  const [card, setCard] = useState<ScanHistoryItem | null>(null);
  const [duplicateCards, setDuplicateCards] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [benchedData, setBenchedData] = useState<Partial<ScanHistoryItem>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const cardId = params.id as string;
    const storedHistory = localStorage.getItem("scanHistory");
    if (storedHistory) {
      const parsedHistory: ScanHistoryItem[] = JSON.parse(storedHistory);
      const foundCard = parsedHistory.find((item) => item.id === cardId);
      
      if (foundCard) {
        setCard(foundCard);
        setNotes(foundCard.notes || "");
        setBenchedData({
          subCategory: foundCard.subCategory || "",
          enableBuyAndCollect: foundCard.enableBuyAndCollect || false,
          condition: foundCard.condition || "",
          gradingCompany: foundCard.gradingCompany || "",
          grade: foundCard.grade || "",
          gradedCertNumber: foundCard.gradedCertNumber || "",
          cardNumber: foundCard.cardNumber || "",
          price: foundCard.price || 0,
          quantity: foundCard.quantity || 1,
        });
        
        const duplicates = parsedHistory.filter(
          item => item.isKeeper && item.name === foundCard.name && item.id !== foundCard.id
        );
        setDuplicateCards(duplicates);
      }
    }
    setIsLoading(false);
  }, [params.id]);
  
  const totalPages = Math.ceil(duplicateCards.length / THUMBNAILS_PER_PAGE);
  const paginatedDuplicates = duplicateCards.slice(
    currentPage * THUMBNAILS_PER_PAGE,
    (currentPage + 1) * THUMBNAILS_PER_PAGE
  );

  const updateCardInStorage = (updatedCard: ScanHistoryItem) => {
    const cardId = params.id;
    const storedHistory = localStorage.getItem("scanHistory");
    if (storedHistory) {
      let parsedHistory: ScanHistoryItem[] = JSON.parse(storedHistory);
      const cardIndex = parsedHistory.findIndex(item => item.id === cardId);
      if (cardIndex !== -1) {
        parsedHistory[cardIndex] = updatedCard;
        localStorage.setItem("scanHistory", JSON.stringify(parsedHistory));
      }
    }
  };

  const handleToggleRare = () => {
    if (card) {
      const updatedCard = { ...card, isRare: !card.isRare };
      setCard(updatedCard);
      updateCardInStorage(updatedCard);
      toast({
        title: updatedCard.isRare ? "Marked as Rare" : "Removed from Rares",
        description: `"${card.name}" has been updated.`,
      });
    }
  };

  const handleSaveNotes = () => {
    if (card) {
      const updatedCard = { ...card, notes: notes, ...benchedData };
      setCard(updatedCard);
      updateCardInStorage(updatedCard);
      toast({
        title: "Details Saved",
        description: `Your details for "${card.name}" have been saved.`,
      });
    }
  };

  const handlePushToBenched = async () => {
    if (!card) return;
    
    try {
      toast({
        title: "Preparing upload...",
        description: "Optimizing image and pushing to Benched.",
      });

      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to upload to Benched.");
      }
      
      const idToken = await user.getIdToken();
      
      let finalImageDataUri = card.imageDataUri || "";
      if (finalImageDataUri) {
        try {
          // Resize longest edge to 1024px and compress to 80% JPEG
          finalImageDataUri = await compressImage(finalImageDataUri, 1024, 0.8);
        } catch (e) {
          console.warn("Failed to compress image, using original", e);
        }
      }

      // Combine card data with Benched specific data
      const payload = {
        imageDataUri: finalImageDataUri,
        title: card.name,
        description: notes || card.notes || "",
        price: benchedData.price || 0,
        category: "Trading Cards",
        subCategory: benchedData.subCategory || "",
        
        // Trading Card Specifics
        manufacturer: card.brand || "",
        year: card.cardYear?.toString() || "",
        cardNumber: benchedData.cardNumber || "",
        condition: benchedData.condition || "",
        
        // Grading Specifics
        gradingCompany: benchedData.gradingCompany || "",
        grade: benchedData.grade || "",
        certNumber: benchedData.gradedCertNumber || "",
        
        // Additional
        quantity: benchedData.quantity || 1,
        enableBuyAndCollect: benchedData.enableBuyAndCollect || false,
      };

      const response = await fetch(
        process.env.NEXT_PUBLIC_BENCHED_API_URL || "https://your-benched-domain.au/api/listings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload to Benched");
      }
      
      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Listing created successfully!`,
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  const handleDelete = () => {
    if (card) {
      const cardId = params.id;
      const storedHistory = localStorage.getItem("scanHistory");
      if (storedHistory) {
        let parsedHistory: ScanHistoryItem[] = JSON.parse(storedHistory);
        const updatedHistory = parsedHistory.filter(item => item.id !== cardId);
        localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
        toast({
          title: "Card Deleted",
          description: `"${card.name}" has been removed from your history.`,
        });
        router.push("/samcam");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-muted/50 h-screen">
        <Boxes className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Card Not Found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The card you are looking for does not exist in your history.
        </p>
        <Button onClick={() => router.push("/samcam")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scanner
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
       <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <Button variant="outline" size="icon" onClick={() => router.push('/samcam')}>
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary">Card Details</h1>
        <div className="w-10"></div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Card Image */}
        <div className="md:col-span-1 flex justify-center items-start pt-8">
            <Dialog>
              <DialogTrigger asChild>
                <div className="w-64 h-80 lg:w-80 lg:h-96 relative cursor-pointer group">
                  {card.imageDataUri ? (
                      <Image
                          src={card.imageDataUri}
                          alt={`Image of ${card.name}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="rounded-xl shadow-2xl border-4 border-primary/50 object-cover"
                      />
                  ) : (
                    <div className="w-full h-full bg-muted rounded-xl shadow-lg border-4 border-primary/20 flex flex-col items-center justify-center text-center p-4">
                      <Boxes className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-foreground">No Image Saved</h3>
                      <p className="text-sm text-muted-foreground">Images are only saved for cards in your 'Keep' list.</p>
                    </div>
                  )}
                   <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center rounded-xl">
                      <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">View Full Size</p>
                    </div>
                </div>
              </DialogTrigger>
              {card.imageDataUri && (
                <DialogContent className="max-w-3xl">
                   <DialogHeader>
                    <DialogTitle>{card.name}</DialogTitle>
                  </DialogHeader>
                  <div className="relative aspect-[2.5/3.5] mx-auto w-full max-w-sm">
                     <Image
                      src={card.imageDataUri}
                      alt={`Full size image of ${card.name}`}
                      fill
                      className="rounded-md object-contain"
                     />
                  </div>
                </DialogContent>
              )}
            </Dialog>
        </div>
        
        {/* Card Details & Notes */}
        <div className="md:col-span-1 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="font-headline text-3xl">{card.name}</span>
                         <Badge variant={card.isKeeper ? "default" : "secondary"} 
                           className={cn("text-lg", card.isKeeper && "bg-green-600 text-white")}>
                          {card.isKeeper ? "Keep" : "Discard"}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {card.isPrizmRookie && (
                        <div className="p-3 rounded-md bg-gradient-to-br from-yellow-400/20 via-red-500/20 to-pink-500/20 text-center">
                            <div className="flex items-center justify-center gap-2 font-bold text-lg text-yellow-700">
                                <Gem className="w-6 h-6" />
                                <span>Prizm Rookie Card!</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {card.isKeeper ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span>Status determined on {new Date(card.timestamp).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4 text-center">
                        {card.brand && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                            <Building className="w-5 h-5 text-primary" />
                            <p className="text-xs text-muted-foreground">Brand</p>
                            <p className="font-semibold text-sm">{card.brand}</p>
                        </div>
                        )}
                         {card.sport && (
                          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                            <Shirt className="w-5 h-5 text-primary" />
                            <p className="text-xs text-muted-foreground">Sport</p>
                            <p className="font-semibold text-sm">{card.sport}</p>
                          </div>
                        )}
                        {card.cardType && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                            <Palette className="w-5 h-5 text-primary" />
                            <p className="text-xs text-muted-foreground">Color</p>
                            <p className="font-semibold text-sm">{card.cardType}</p>
                        </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2">
                  <Button onClick={handleToggleRare} variant={card.isRare ? "default" : "outline"} size="sm" className="w-[70%]">
                    <Star className={cn("w-4 h-4 mr-2", card.isRare && "fill-yellow-300 text-yellow-500")} />
                    {card.isRare ? "Unmark Rare" : "Mark as Rare"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-[30%]">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          card from your history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
            </Card>

            {card.isKeeper && (
              <Card>
                <CardHeader>
                  <CardTitle>Collector's Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Add notes about condition, print run, etc.</Label>
                    <Textarea 
                      id="notes"
                      placeholder="e.g. Graded PSA 9, slight corner wear on top left..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveNotes}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {card.isKeeper && (
              <Card>
                <CardHeader>
                  <CardTitle>Benched.au Listing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sub-Category</Label>
                      <Input 
                        placeholder="e.g. Basketball, Pokemon..."
                        value={benchedData.subCategory || ""}
                        onChange={(e) => setBenchedData({...benchedData, subCategory: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select 
                        value={benchedData.condition || ""}
                        onValueChange={(val) => setBenchedData({...benchedData, condition: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Brand New">Brand New</SelectItem>
                          <SelectItem value="Used">Used</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Grading Company</Label>
                      <Input 
                        placeholder="e.g. PSA, BGS..."
                        value={benchedData.gradingCompany || ""}
                        onChange={(e) => setBenchedData({...benchedData, gradingCompany: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Input 
                        placeholder="e.g. 10, 9.5"
                        value={benchedData.grade || ""}
                        onChange={(e) => setBenchedData({...benchedData, grade: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Certification #</Label>
                      <Input 
                        placeholder="PSA Cert #"
                        value={benchedData.gradedCertNumber || ""}
                        onChange={(e) => setBenchedData({...benchedData, gradedCertNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input 
                        placeholder="e.g. #123"
                        value={benchedData.cardNumber || ""}
                        onChange={(e) => setBenchedData({...benchedData, cardNumber: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Price (AUD) *</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={benchedData.price || 0}
                        onChange={(e) => setBenchedData({...benchedData, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={benchedData.quantity || 1}
                        onChange={(e) => setBenchedData({...benchedData, quantity: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                    <Switch 
                      id="buyAndCollect"
                      checked={benchedData.enableBuyAndCollect || false}
                      onCheckedChange={(checked) => setBenchedData({...benchedData, enableBuyAndCollect: checked})}
                    />
                    <Label htmlFor="buyAndCollect">Enable Buy & Collect (Local pickup)</Label>
                  </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleSaveNotes}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Details
                  </Button>
                  <Button onClick={handlePushToBenched}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Push to Benched
                  </Button>
                </CardFooter>
              </Card>
            )}
        </div>

        {/* Other Copies */}
        <div className="md:col-span-1">
          {duplicateCards.length > 0 && (
              <div>
                  <h3 className="text-lg font-semibold mb-2">Other Copies in Collection ({duplicateCards.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                      {paginatedDuplicates.map(dup => (
                          <Link href={`/card/${dup.id}`} key={dup.id}>
                              <div className="group aspect-[2.5/3.5] relative rounded-md overflow-hidden shadow-md transform transition-transform duration-200 hover:scale-105 hover:shadow-lg border-2 border-transparent hover:border-primary">
                              {dup.imageDataUri ? (
                                  <Image
                                      src={dup.imageDataUri}
                                      alt={`Image of ${dup.name}`}
                                      fill
                                      sizes="20vw"
                                      className="object-cover"
                                  />
                              ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center">
                                      <Boxes className="w-8 h-8 text-muted-foreground" />
                                  </div>
                              )}
                              </div>
                          </Link>
                      ))}
                  </div>
                   {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1} variant="outline">
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
