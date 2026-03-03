'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Sparkles, AlertCircle, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { bulkSuggestCards } from '@/ai/flows/bulk-suggest-cards';
import { uploadImages } from '@/lib/firebase/storage';
import Image from 'next/image';

export function BulkCardScanner() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to 20 total
        const newTotal = selectedFiles.length + files.length;
        if (newTotal > 20) {
            toast({ 
                title: "Limit exceeded", 
                description: "You can upload a maximum of 20 cards at once.", 
                variant: "destructive" 
            });
            return;
        }

        setSelectedFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkScan = async () => {
        if (!user) {
            toast({ title: "Sign in required", description: "Please sign in to use the scanner.", variant: "destructive" });
            router.push('/sign-in?redirect=/card-scan');
            return;
        }

        if (selectedFiles.length === 0) return;

        setIsAnalyzing(true);

        try {
            const idToken = await user.getIdToken();
            
            // Convert all files to base64
            const base64Promises = selectedFiles.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            });

            const base64Images = await Promise.all(base64Promises);

            const result = await bulkSuggestCards({
                photoDataUris: base64Images,
                idToken
            });

            if (result.error) throw new Error(result.error);

            // Upload the original files to Firebase Storage
            const uploadedUrls = await uploadImages(selectedFiles, `products/${user.uid}`);

            // Store results in session storage for the bulk edit page
            if (result.data) {
                // Attach real storage URLs to the result for display and saving
                const resultsWithImages = result.data.cards.map((card, idx) => ({
                    ...card,
                    localPreview: uploadedUrls[idx] || previews[idx], // Fallback to local if upload failed for one
                }));
                
                sessionStorage.setItem('bulk_scan_results', JSON.stringify(resultsWithImages));
                router.push('/sell/bulk');
            }

        } catch (error: any) {
            console.error("Bulk Analysis failed:", error);
            toast({ 
                title: "Scan Failed", 
                description: error.message || "Could not analyze images.", 
                variant: "destructive" 
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <Card className="border-dashed border-2 border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-900/10">
                <CardContent className="p-10">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600">
                            <Upload className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Bulk Upload Cards</h3>
                            <p className="text-muted-foreground">Select up to 20 images of your cards to scan them all at once.</p>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <Button 
                            variant="default" 
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                        >
                            Select Images
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {previews.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-600" />
                            Selected Cards ({previews.length}/20)
                        </h4>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                                previews.forEach(p => URL.revokeObjectURL(p));
                                setPreviews([]);
                                setSelectedFiles([]);
                            }}
                        >
                            Clear All
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {previews.map((preview, idx) => (
                            <div key={idx} className="relative group aspect-[2.5/3.5] rounded-lg overflow-hidden border bg-white dark:bg-gray-800">
                                <Image
                                    src={preview}
                                    alt={`Card ${idx + 1}`}
                                    fill
                                    className="object-contain p-1"
                                />
                                <button
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    onClick={() => removeFile(idx)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 flex justify-center">
                        <Button
                            size="lg"
                            variant="default"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full max-w-sm h-14 text-xl font-black shadow-xl"
                            onClick={handleBulkScan}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    AI Analyzing Batch...
                                </>
                            ) : (
                                <>
                                    Analyze {previews.length} Cards <Sparkles className="ml-2 h-6 w-6" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
