
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Globe, Search, Save, FileCode } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function SEOPage() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateSitemap = async () => {
        setIsGenerating(true);
        // Simulate sitemap generation
        setTimeout(() => {
            setIsGenerating(false);
            toast({
                title: "Sitemap Generated",
                description: "sitemap.xml has been updated successfully.",
            });
        }, 2000);
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SEO Management</h1>
                <p className="text-muted-foreground">Configure global meta tags and search engine visibility.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Global Metadata
                        </CardTitle>
                        <CardDescription>Default settings for pages without specific SEO overrides.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Site Title Template</Label>
                            <Input placeholder="%s | Picksy - The Collector&apos;s Marketplace" />
                            <p className="text-xs text-muted-foreground">Use %s as a placeholder for the page title.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Default Description</Label>
                            <Textarea placeholder="The premier marketplace for grading, buying, and selling collector cards, coins, and memorabilia." />
                        </div>
                        <div className="space-y-2">
                            <Label>Keywords (Comma separated)</Label>
                            <Input placeholder="trading cards, sports cards, coins, grading, psa, bgs" />
                        </div>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Allow Indexing</Label>
                                <p className="text-xs text-muted-foreground">If disabled, adds 'noindex' to all pages.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileCode className="h-5 w-5 text-orange-500" />
                                Sitemap
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Last generated: <span className="text-foreground">2 hours ago</span>
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleGenerateSitemap}
                                disabled={isGenerating}
                            >
                                {isGenerating ? "Generating..." : "Regenerate Sitemap"}
                            </Button>
                            <Button variant="link" className="w-full" asChild>
                                <a href="/sitemap.xml" target="_blank">View sitemap.xml</a>
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
                            <div className="bg-muted p-3 rounded-md border">
                                <pre className="text-xs text-muted-foreground font-mono">
                                    User-agent: *<br/>
                                    Allow: /<br/>
                                    Disallow: /admin/<br/>
                                    Disallow: /profile/<br/>
                                    Sitemap: https://picksy.com/sitemap.xml
                                </pre>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full">Edit File</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
