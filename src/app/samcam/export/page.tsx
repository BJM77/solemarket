
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FolderUp, FolderDown, Loader, Inbox } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/samcam/components/ui/card";
import { ScanHistoryItem } from "@/samcam/lib/types";
import { useToast } from "@/samcam/hooks/use-toast";

export default function ExportPage() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedHistory = localStorage.getItem("scanHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
    setIsLoading(false);
  }, []);

  const downloadCSV = (data: ScanHistoryItem[], filename: string) => {
    if (data.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: `There are no cards in the ${filename.includes('keep') ? 'keep' : 'discard'} pile.`,
      });
      return;
    }

    const headers = [
      "ID", "Name", "IsKeeper", "Timestamp", "Brand", "CardType", 
      "Sport", "IsRare", "Notes", "CardYear", "IsPrizmRookie", 
      "AvgSalesPrice", "SalesCount", "SalesSource"
    ];
    
    const csvContent = [
      headers.join(","),
      ...data.map(item => [
        item.id,
        `"${item.name?.replace(/"/g, '""') || ''}"`,
        item.isKeeper,
        item.timestamp ? new Date(item.timestamp).toISOString() : '',
        `"${item.brand?.replace(/"/g, '""') || ''}"`,
        `"${item.cardType?.replace(/"/g, '""') || ''}"`,
        `"${item.sport?.replace(/"/g, '""') || ''}"`,
        item.isRare || false,
        `"${item.notes?.replace(/"/g, '""').replace(/\n/g, ' ') || ''}"`,
        item.cardYear || '',
        item.isPrizmRookie || false,
        item.salesData?.averagePrice || '',
        item.salesData?.salesCount || '',
        `"${item.salesData?.source?.replace(/"/g, '""') || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: "Export Successful",
        description: `${filename} has been downloaded.`,
    });
  };

  const handleExportKeep = () => {
    const keepPile = history.filter(item => item.isKeeper);
    downloadCSV(keepPile, "card_keeper_keep_pile.csv");
  };

  const handleExportDiscard = () => {
    const discardPile = history.filter(item => !item.isKeeper);
    downloadCSV(discardPile, "card_keeper_discard_pile.csv");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button variant="outline" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary">Export Collection</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Download Your Data</CardTitle>
            <CardDescription>
              Export your "Keep" or "Discard" piles as a CSV file. This file can be opened in any spreadsheet software like Excel, Google Sheets, or Numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={handleExportKeep} size="lg">
                        <FolderUp className="mr-2 h-5 w-5" />
                        Export Keep Pile ({history.filter(i => i.isKeeper).length})
                    </Button>
                    <Button onClick={handleExportDiscard} size="lg" variant="secondary">
                        <FolderDown className="mr-2 h-5 w-5" />
                        Export Discard Pile ({history.filter(i => !i.isKeeper).length})
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg">
                    <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No Scans to Export</h3>
                    <p className="text-sm text-muted-foreground">
                        Once you start scanning cards, you'll be able to export them here.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
