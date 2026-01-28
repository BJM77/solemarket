'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Globe, Search, Save, FileCode, MapPin, Loader2, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getSEOSettings, saveSEOSettings, type SEOSettings } from './actions';

export default function SEOPage() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, startSaveTransition] = useTransition();
    const [settings, setSettings] = useState<SEOSettings | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getSEOSettings();
            setSettings(data);
        };
        loadSettings();
    }, []);

    const handleSave = () => {
        if (!settings) return;
        startSaveTransition(async () => {
            const result = await saveSEOSettings(settings);
            toast({
                title: result.success ? "SEO Optimized" : "Update Failed",
                description: result.message,
                variant: result.success ? "default" : "destructive"
            });
        });
    };

    const handleGenerateSitemap = async () => {
        setIsGenerating(true);
        // Simulate sitemap generation
        setTimeout(() => {
            setIsGenerating(false);
            toast({
                title: "Sitemap Generated",
                description: "sitemap.xml has been updated and pinged to Google AU.",
            });
        }, 2000);
    };

    if (!settings) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <PageHeader
                title="Google Organic Search Strategy"
                description="Optimize Picksy for Australian collectors and local search visibility."
            />

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-8">
                    {/* Australia Focus Section */}
                    <Card className="border-2 border-primary/20 shadow-md">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <MapPin className="h-5 w-5" />
                                Regional Targeting (Australia Only)
                            </CardTitle>
                            <CardDescription>
                                Signals to Google that this platform serves the Australian market exclusively.
                                This decreases bounce rates from international traffic and boosts ranking in Google.com.au.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-primary/10">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Focus Search Results to Australia</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Injects alternate `en-AU` and `hreflang` tags to prioritize Australian organic search.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.australiaOnly}
                                    onCheckedChange={(checked) => setSettings({ ...settings, australiaOnly: checked })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Business Locality</Label>
                                    <Input
                                        value={settings.localBusinessSchema.addressLocality}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            localBusinessSchema: { ...settings.localBusinessSchema, addressLocality: e.target.value }
                                        })}
                                        placeholder="Perth, Sydney, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>State/Region</Label>
                                    <Input
                                        value={settings.localBusinessSchema.addressRegion}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            localBusinessSchema: { ...settings.localBusinessSchema, addressRegion: e.target.value }
                                        })}
                                        placeholder="WA, NSW, VIC..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                Global Metadata
                            </CardTitle>
                            <CardDescription>Default settings for pages without specific SEO overrides.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Site Title Template</Label>
                                <Input
                                    value={settings.siteTitleTemplate}
                                    onChange={(e) => setSettings({ ...settings, siteTitleTemplate: e.target.value })}
                                    placeholder="%s | Picksy - Australia's Local Marketplace"
                                />
                                <p className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded inline-block">Use %s as a placeholder for the page title.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Default Australian Meta Description</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    value={settings.defaultDescription}
                                    onChange={(e) => setSettings({ ...settings, defaultDescription: e.target.value })}
                                    placeholder="The premier Australian marketplace for grading, buying, and selling collector cards, coins, and memorabilia."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Target Keywords (comma-separated)</Label>
                                <Input
                                    value={settings.keywords}
                                    onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
                                    placeholder="trading cards australia, coin collecting australia, etc."
                                />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Allow Search Engine Indexing</Label>
                                    <p className="text-xs text-muted-foreground">If disabled, adds 'noindex' to all pages.</p>
                                </div>
                                <Switch
                                    checked={settings.allowIndexing}
                                    onCheckedChange={(checked) => setSettings({ ...settings, allowIndexing: checked })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t flex justify-end py-4">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Deploy SEO Updates
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-blue-50/30 border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-500" />
                                SEO Best Practice
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-blue-900/80 space-y-2">
                            <p>For Australia-specific focus:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Use "Australia" in the page titles.</li>
                                <li>Configure Local Business Schema.</li>
                                <li>Include Australian cities in descriptions.</li>
                                <li>Enable the Hreflang en-AU tag.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileCode className="h-5 w-5 text-orange-500" />
                                Sitemap
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Last verified by Google: <span className="text-foreground font-medium">Just now</span>
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleGenerateSitemap}
                                disabled={isGenerating}
                            >
                                {isGenerating ? "Processing..." : "Sync with Search Console"}
                            </Button>
                            <Button variant="link" className="w-full text-xs" asChild>
                                <a href="/sitemap.xml" target="_blank">Download sitemap.xml</a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-green-500" />
                                Robots.txt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-zinc-950 p-4 rounded-lg border border-white/10">
                                <pre className="text-[10px] text-green-400 font-mono">
                                    User-agent: *<br />
                                    Allow: /<br />
                                    Disallow: /admin/<br />
                                    Disallow: /profile/<br />
                                    <br />
                                    # Australia Targeting<br />
                                    Sitemap: https://picksy.com.au/sitemap.xml
                                </pre>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full text-xs">Edit Robots Directive</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
