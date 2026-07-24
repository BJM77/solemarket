"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/samcam/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/samcam/components/ui/select";
import Link from "next/link";
import { List, Smartphone } from "lucide-react";
import { LoggedError } from "@/samcam/hooks/use-error-log";
import { detectDevice, DeviceProfile } from "@/samcam/lib/device-detector";

interface SettingsSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  errorLog: {
    errors: LoggedError[];
    clearErrors: () => void;
  };
  selectedDevice?: string;
  setSelectedDevice?: (device: string) => void;
  showHUD?: boolean;
  setShowHUD?: (show: boolean) => void;
  hudPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  setHudPosition?: (pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
}

export default function SettingsSheet({
  isOpen,
  setIsOpen,
  errorLog,
  selectedDevice,
  setSelectedDevice,
  showHUD,
  setShowHUD,
  hudPosition,
  setHudPosition,
}: SettingsSheetProps) {
  const [detectedProfile, setDetectedProfile] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    setDetectedProfile(detectDevice());
  }, []);

  const devicePresets = [
    { id: 'auto', label: 'Auto-Detect', icon: '🔍' },
    { id: 'samsung', label: 'Samsung Galaxy', icon: '📱' },
    { id: 'google', label: 'Google Pixel', icon: '📱' },
    { id: 'apple', label: 'iPhone', icon: '🍎' },
    { id: 'oneplus', label: 'OnePlus', icon: '📱' },
    { id: 'generic', label: 'Generic Device', icon: '📱' },
  ];

  const hasDeviceOverride = selectedDevice !== undefined && setSelectedDevice !== undefined;
  const hasHUDConfig = showHUD !== undefined && setShowHUD !== undefined;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:w-3/4 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-headline">Settings</SheetTitle>
          <SheetDescription>
            Manage camera features, HUD overlays, and device profiles.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow py-4 space-y-6 overflow-y-auto pr-6 -mr-6">
          
          {/* Device Profile Selection */}
          {hasDeviceOverride && (
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Device Profile
              </Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your device" />
                </SelectTrigger>
                <SelectContent>
                  {devicePresets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.icon} {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {detectedProfile && (
                <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                  <p>System Detected: <strong>{detectedProfile.name}</strong></p>
                  {detectedProfile.hasMacroMode && <p className="text-green-600 font-semibold">✓ Macro Mode Supported</p>}
                  {detectedProfile.isHighEnd && <p className="text-green-600 font-semibold">✓ High Performance Profile</p>}
                  <p className="text-muted-foreground mt-1">
                    Target Resolution: {detectedProfile.recommendedResolution.width}x{detectedProfile.recommendedResolution.height}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasDeviceOverride && <Separator />}

          {/* HUD Preferences */}
          {hasHUDConfig && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">HUD Configuration</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Quality HUD Overlay</span>
                <Switch checked={showHUD} onCheckedChange={setShowHUD} />
              </div>
              
              {showHUD && hudPosition !== undefined && setHudPosition !== undefined && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">HUD Screen Position</span>
                  <Select value={hudPosition} onValueChange={(v: any) => setHudPosition(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="HUD Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {hasHUDConfig && <Separator />}

          <div className="space-y-4">
            <Label className="text-base font-semibold">Manage Keep List</Label>
            <p className="text-sm text-muted-foreground">
              Manage the list of players you want the AI to keep.
            </p>
            <Button asChild>
              <Link href="/samcam/list" onClick={() => setIsOpen(false)}>
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
