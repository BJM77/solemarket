'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CardScanner } from '@/components/scan/CardScanner';
import { BulkCardScanner } from '@/components/scan/BulkCardScanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Layers } from 'lucide-react';

/**
 * Accessibility Strategy:
 * 1. Semantic landmarks used for page structure.
 * 2. Tabs pattern (WAI-ARIA) implemented via Radix UI Tabs component.
 * 3. Focus management handled by the Tabs component.
 * 4. High-contrast indicators and icon labels for screen readers.
 */

export default function CardScanPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    {/* PageHeader provides the main H1 for the page */}
                    <PageHeader
                        title="AI Card Scanner"
                        description="Snap a photo of your cards. We'll identify the player, set, and estimate the grade."
                    />
                </div>
                
                {/* 
                  Accessibility: Using Radix Tabs which follows WAI-ARIA patterns.
                  role="tablist", role="tab", role="tabpanel" are handled automatically.
                */}
                <Tabs defaultValue="single" className="max-w-4xl mx-auto">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="single" className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                <span>Single Scan</span>
                            </TabsTrigger>
                            <TabsTrigger value="bulk" className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                <span>Bulk Upload (up to 20)</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="single" className="animate-in fade-in slide-in-from-bottom-4">
                        <CardScanner />
                    </TabsContent>

                    <TabsContent value="bulk" className="animate-in fade-in slide-in-from-bottom-4">
                        <BulkCardScanner />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
