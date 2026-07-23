
"use client";

import Link from "next/link";
import { ScrollArea } from "@/samcam/components/ui/scroll-area";
import type { ScanHistoryItem } from "@/samcam/lib/types";
import { cn } from "@/samcam/lib/utils";
import { XCircle, CheckCircle, Boxes, Trash2, PlusCircle } from "lucide-react";
import { Button } from "./ui/button";

interface HistoryLogProps {
  history: ScanHistoryItem[];
  onDeleteItem: (id: string) => void;
  onAddNameToKeep: (name: string, sport?: string) => void;
}

export default function HistoryLog({ history, onDeleteItem, onAddNameToKeep }: HistoryLogProps) {
  if (history.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-muted/50">
        <Boxes className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Scans Yet</h3>
        <p className="text-sm text-muted-foreground">Your scanned cards will appear here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-grow">
      <div className="p-2 space-y-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg group"
          >
            {item.isKeeper ? (
              <Link href={`/card/${item.id}`} className="flex-grow flex items-center gap-3 truncate hover:bg-muted/50 rounded-md p-1 -m-1">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-grow truncate">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.sport || 'Uncategorized'} &bull; {item.brand || 'N/A'}
                  </p>
                </div>
              </Link>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-grow truncate">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.sport || 'Uncategorized'} &bull; {item.brand || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center">
                   <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddNameToKeep(item.name, item.sport);
                    }}
                    aria-label="Add to Keep List"
                    >
                    <PlusCircle className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item.id);
                        }}
                        aria-label="Delete scan"
                        >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
