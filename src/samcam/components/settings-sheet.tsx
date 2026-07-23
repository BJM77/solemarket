
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/samcam/components/ui/sheet";
import { Button } from "@/samcam/components/ui/button";
import { Label } from "@/samcam/components/ui/label";
import { Separator } from "@/samcam/components/ui/separator";
import Link from "next/link";
import { List } from "lucide-react";
import { LoggedError } from "@/samcam/hooks/use-error-log";

interface SettingsSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  errorLog: {
    errors: LoggedError[];
    clearErrors: () => void;
  };
}

export default function SettingsSheet({
  isOpen,
  setIsOpen,
  errorLog,
}: SettingsSheetProps) {

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:w-3/4 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-headline">Settings</SheetTitle>
          <SheetDescription>
            Manage your application settings.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow py-4 space-y-6 overflow-y-auto pr-6 -mr-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">API Configuration</Label>
            <p className="text-sm text-muted-foreground">
                To use the AI features, make sure your Google AI API Key is configured in the `.env` file.
            </p>
             <p className="text-xs text-muted-foreground">You can get a key from Google AI Studio.</p>
          </div>
          <Separator />
          <div className="space-y-4">
            <Label className="text-base font-semibold">Manage Keep List</Label>
            <p className="text-sm text-muted-foreground">
              Manage the list of players you want the AI to keep.
            </p>
            <Button asChild>
              <Link href="/list" onClick={() => setIsOpen(false)}>
                <List className="mr-2 h-4 w-4" />
                Go to Keep List Manager
              </Link>
            </Button>
          </div>
        </div>
        <SheetFooter className="pt-4">
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}



