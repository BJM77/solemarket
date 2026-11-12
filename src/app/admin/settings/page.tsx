'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle, Loader2, Save, Truck, DollarSign, Percent, Palette } from "lucide-react";
import Link from 'next/link';
import { testApiKey } from '@/ai/flows/test-api-key';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getSystemSettings, saveSystemSettings, type AdminSystemSettings } from './actions';
import { motion } from "framer-motion";

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const [isTesting, startTestTransition] = useTransition();
    const [isSavingShipping, startShippingTransition] = useTransition();
    const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
    const [settings, setSettings] = useState<AdminSystemSettings>({
        freightCharge: 12.00,
        freeShippingThreshold: 150.00,
        standardTaxRate: 0.10
    });

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getSystemSettings();
            setSettings(data);
        };
        loadSettings();
    }, []);

    const handleSaveShippingSettings = () => {
        startShippingTransition(async () => {
            try {
                const idToken = await getCurrentUserIdToken();
                if (!idToken) {
                    toast({
                        title: 'Save Failed',
                        description: 'Authentication required.',
                        variant: 'destructive',
                    });
                    return;
                }
                const result = await saveSystemSettings(settings, idToken);
                toast({
                    title: result.success ? 'Settings Saved' : 'Save Failed',
                    description: result.message,
                    variant: result.success ? 'default' : 'destructive',
                });
            } catch (error: any) {
                toast({
                    title: 'Save Failed',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        });
    };

    const handleTestApiKey = () => {
        startTestTransition(async () => {
            setTestResult(null);
            try {
                const idToken = await getCurrentUserIdToken();
                if (!idToken) throw new Error("Not authenticated");
                const result = await testApiKey(idToken);
                setTestResult(result);
                toast({
                    title: result.status === 'Success' ? 'API Connection Verified' : 'API Connection Failed',
                    description: result.message,
                    variant: result.status === 'Success' ? 'default' : 'destructive',
                });
            } catch (error: any) {
                setTestResult({ status: 'Error', message: error.message });
                toast({
                    title: 'Verification Failed',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <div className="space-y-12 pb-20">
            <header>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2">
                        System Settings
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
                        Configure core platform parameters and integrations.
                    </p>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-10 rounded-2xl">
                    <CardHeader className="px-0 pt-0 mb-8">
                        <CardTitle className="text-2xl font-black tracking-tight">AI Service Status</CardTitle>
                        <CardDescription>Verify the connection to the Gemini API.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                        <Button onClick={handleTestApiKey} disabled={isTesting} className="w-full h-12 font-bold rounded-xl">
                            {isTesting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                            ) : (
                                "Test Gemini API Key"
                            )}
                        </Button>
                        {testResult && (
                            <Alert className={`mt-4 rounded-xl ${testResult.status === 'Success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                {testResult.status === 'Success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle className="font-bold">{testResult.status}</AlertTitle>
                                <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <Card className="p-10 rounded-2xl">
                    <CardHeader className="px-0 pt-0 mb-8">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Truck className="w-6 h-6 text-primary" /> Shipping &amp; Logistics
                        </CardTitle>
                        <CardDescription>Configure shipping rates and thresholds.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <DollarSign className="w-3 h-3" /> Standard Freight Charge (AUD)
                            </Label>
                            <Input
                                type="number"
                                value={settings.freightCharge}
                                onChange={(e) => setSettings({ ...settings, freightCharge: parseFloat(e.target.value) })}
                                className="h-12 rounded-xl border-muted bg-muted/20 font-bold"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" /> Free Shipping Threshold (AUD)
                            </Label>
                            <Input
                                type="number"
                                value={settings.freeShippingThreshold}
                                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) })}
                                className="h-12 rounded-xl border-muted bg-muted/20 font-bold"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Percent className="w-3 h-3" /> Standard Tax Rate
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={settings.standardTaxRate}
                                onChange={(e) => setSettings({ ...settings, standardTaxRate: parseFloat(e.target.value) })}
                                className="h-12 rounded-xl border-muted bg-muted/20 font-bold"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="px-0 pt-8 mt-4 border-t">
                        <Button
                            onClick={handleSaveShippingSettings}
                            disabled={isSavingShipping}
                            className="w-full h-12 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                        >
                            {isSavingShipping ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Logistics Settings</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="p-10 rounded-2xl">
                    <CardHeader className="px-0 pt-0 mb-8">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Palette className="w-6 h-6 text-primary" /> Branding &amp; Appearance
                        </CardTitle>
                        <CardDescription>
                            Logo, colours, fonts, menus and homepage tiles are managed in Brand Refresh.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                        <Button asChild className="w-full h-12 font-bold rounded-xl">
                            <Link href="/admin/brand-refresh">Open Brand Refresh</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
