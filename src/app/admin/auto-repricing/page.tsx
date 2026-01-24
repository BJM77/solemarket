'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAutoRepricingSettings, saveAutoRepricingSettings } from './actions';
import { Loader2 } from 'lucide-react';

export default function AutoRepricingPage() {
    const { toast } = useToast();
    const [viewThreshold, setViewThreshold] = useState<number>(100);
    const [priceDropPercentage, setPriceDropPercentage] = useState<number>(3);
    const [waitingPeriodHours, setWaitingPeriodHours] = useState<number>(48);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            setIsLoading(true);
            const settings = await getAutoRepricingSettings();
            if (settings) {
                setViewThreshold(settings.viewThreshold);
                setPriceDropPercentage(settings.priceDropPercentage);
                setWaitingPeriodHours(settings.waitingPeriodHours);
            }
            setIsLoading(false);
        }
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        const result = await saveAutoRepricingSettings({
            viewThreshold,
            priceDropPercentage,
            waitingPeriodHours
        });
        
        if (result.success) {
            toast({
                title: "Settings Saved",
                description: result.message,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.message,
            });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="Auto-Repricing Settings"
                description="Configure the logic for automated product price adjustments."
            />

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Global Auto-Repricing Rules</CardTitle>
                    <CardDescription>
                        These settings will apply to all products with auto-repricing enabled.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="viewThreshold">Unique View Threshold</Label>
                        <Input
                            id="viewThreshold"
                            type="number"
                            min="1"
                            value={viewThreshold}
                            onChange={(e) => setViewThreshold(parseInt(e.target.value))}
                            className="mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Price adjustment will be triggered once this number of unique views is reached.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="priceDropPercentage">Price Drop Percentage (%)</Label>
                        <Input
                            id="priceDropPercentage"
                            type="number"
                            min="1"
                            max="100"
                            value={priceDropPercentage}
                            onChange={(e) => setPriceDropPercentage(parseInt(e.target.value))}
                            className="mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            The percentage by which the price will be reduced.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="waitingPeriodHours">Waiting Period (hours)</Label>
                        <Input
                            id="waitingPeriodHours"
                            type="number"
                            min="0"
                            value={waitingPeriodHours}
                            onChange={(e) => setWaitingPeriodHours(parseInt(e.target.value))}
                            className="mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Time to wait after the view threshold is met before reducing the price.
                        </p>
                    </div>
                    <div className="text-right">
                        <Button onClick={handleSaveSettings} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Settings"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
