'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette, CheckCircle, AlertTriangle, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { Logo } from '@/components/logo';
import { motion } from "framer-motion";
import { testApiKey } from '@/ai/flows/test-api-key';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Truck, DollarSign, Percent } from "lucide-react";
import { getSystemSettings, saveSystemSettings, type SystemSettings } from './actions';
import { useEffect } from 'react';

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const [isTesting, startTestTransition] = useTransition();
    const [isSavingShipping, startShippingTransition] = useTransition();
    const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
    const [settings, setSettings] = useState<SystemSettings>({
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
                const result = await saveSystemSettings(settings, idToken || undefined);
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
                {/* AI Service Status */}
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

                {/* Shipping & Logistics */}
                <Card className="p-10 rounded-2xl">
                    <CardHeader className="px-0 pt-0 mb-8">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Truck className="w-6 h-6 text-primary" /> Shipping & Logistics
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

                {/* Color Palette */}
                <Card className="p-10 rounded-2xl">
                    <CardHeader className="px-0 pt-0 mb-8">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Palette className="w-6 h-6 text-primary" /> Branding &amp; Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Logo</Label>
                            <div className="p-8 rounded-xl bg-muted/50 border border-dashed flex flex-col items-center justify-center">
                                <Logo className="w-auto h-10" />
                                <Button variant="ghost" className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground rounded-lg">
                                    <Upload className="mr-2 h-3 w-3" /> Change Logo
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accent Color</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg border p-1 bg-muted/50">
                                    <input
                                        type="color"
                                        defaultValue="#6366f1"
                                        className="w-full h-full rounded-md bg-transparent border-none cursor-pointer"
                                    />
                                </div>
                                <div className="text-sm font-mono font-bold uppercase tracking-tighter">#6366F1</div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="px-0 pt-8 mt-4 border-t">
                        <Button className="w-full h-12 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                            <Save className="w-4 h-4 mr-2" /> Save Aesthetic Changes
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
