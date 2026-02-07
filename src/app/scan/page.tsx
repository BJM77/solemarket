'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Scan, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CardUploader from '@/components/scan/CardUploader';
import ScanResults from '@/components/scan/ScanResults';
import { scanCards } from '@/app/actions/scan';
import { useUser } from '@/firebase';
import type { ScannedCard } from '@/lib/types/scan';

export default function ScanPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [targetCards, setTargetCards] = useState(20);
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<{
        cards: ScannedCard[];
        totalValue: number;
        processingTime: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const handleScan = async () => {
        if (!user) {
            setError('Please sign in to use the scanner');
            router.push('/sign-in?redirect=/scan');
            return;
        }

        if (!selectedFile) {
            setError('Please select an image first');
            return;
        }

        setIsScanning(true);
        setError(null);
        setResults(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('targetCards', targetCards.toString());

            const result = await scanCards(formData, user.uid);

            if (result.success && result.cards) {
                setResults({
                    cards: result.cards,
                    totalValue: result.totalValue || 0,
                    processingTime: result.processingTime || 0,
                });
            } else {
                setError(result.error || 'Failed to scan cards');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while scanning');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            <div className="container max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Scan className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-3">
                        Multi-Card Scanner
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Upload a photo of your trading cards and let AI identify valuable cards instantly
                    </p>
                </motion.header>

                {/* Info Alert */}
                <Alert className="mb-8 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                        <strong>How it works:</strong> Upload a photo with 20-30 cards in a grid layout.
                        Our AI will detect each card, identify it, and categorize by value (Grade/Keep/Bulk).
                    </AlertDescription>
                </Alert>

                {!results ? (
                    /* Upload Section */
                    <Card className="p-8">
                        <CardContent className="space-y-6">
                            <CardUploader
                                onImageSelect={setSelectedFile}
                                isLoading={isScanning}
                            />

                            {/* Target Cards Input */}
                            <div className="space-y-2">
                                <Label htmlFor="targetCards" className="text-sm font-semibold">
                                    Expected Number of Cards
                                </Label>
                                <Input
                                    id="targetCards"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={targetCards}
                                    onChange={(e) => setTargetCards(parseInt(e.target.value) || 20)}
                                    className="max-w-xs"
                                    disabled={isScanning}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Helps optimize grid detection (default: 20)
                                </p>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Scan Button */}
                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-bold"
                                onClick={handleScan}
                                disabled={!selectedFile || isScanning || isUserLoading || !user}
                            >
                                {isScanning ? (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                                        Scanning Cards...
                                    </>
                                ) : !user ? (
                                    <>
                                        <Scan className="w-5 h-5 mr-2" />
                                        Sign In to Scan
                                    </>
                                ) : (
                                    <>
                                        <Scan className="w-5 h-5 mr-2" />
                                        Scan Cards
                                    </>
                                )}
                            </Button>

                            {isScanning && (
                                <p className="text-center text-sm text-muted-foreground">
                                    This may take 10-30 seconds depending on the number of cards...
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    /* Results Section */
                    <div className="space-y-6">
                        <ScanResults
                            cards={results.cards}
                            totalValue={results.totalValue}
                            processingTime={results.processingTime}
                        />

                        {/* Scan Another Button */}
                        <div className="text-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setResults(null);
                                    setSelectedFile(null);
                                    setError(null);
                                }}
                            >
                                Scan Another Batch
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tips Section */}
                {!results && (
                    <div className="mt-12 p-6 rounded-lg bg-muted/50">
                        <h3 className="font-bold mb-3">📸 Tips for Best Results</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Arrange cards in a grid layout (4×5, 5×5, or 6×5)</li>
                            <li>• Use good lighting without glare or shadows</li>
                            <li>• Place cards on a flat, contrasting surface</li>
                            <li>• Ensure card names are clearly visible</li>
                            <li>• Take photo from directly above (not at an angle)</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
