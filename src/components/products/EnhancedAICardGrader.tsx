'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, CheckCircle2, ShieldCheck, TrendingUp, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatPrice } from '@/lib/utils';
import { gradeCardDetailsAction } from '@/app/actions/ai-grading';
import { suggestListingDetailsAction } from '@/app/actions/ai-grading';
import type { GradeCardDetailsOutput } from '@/ai/schemas/grading-schemas';
import type { SuggestListingDetailsOutput } from '@/ai/flows/schemas';
import { useUser } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface EnhancedAICardGraderProps {
    onGradeComplete?: (grade: string) => void;
    onApplySuggestions: (suggestions: SuggestListingDetailsOutput) => void;
    imageFiles: File[];
}

export default function EnhancedAICardGrader({ onGradeComplete, onApplySuggestions, imageFiles }: EnhancedAICardGraderProps) {
    const [isGrading, setIsGrading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [gradingResult, setGradingResult] = useState<GradeCardDetailsOutput | null>(null);
    const [listingResult, setListingResult] = useState<SuggestListingDetailsOutput | null>(null);
    const { toast } = useToast();
    const { user } = useUser();

    const getGradeColor = (grade: number) => {
        if (grade >= 9) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (grade >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (grade >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };

    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-emerald-600';
        if (score >= 7) return 'text-blue-600';
        if (score >= 5) return 'text-amber-600';
        return 'text-rose-600';
    };

    const handleDetailedGrading = async () => {
        if (imageFiles.length === 0) {
            toast({
                title: "No Images",
                description: "Please upload at least the front of your card for grading.",
                variant: "destructive"
            });
            return;
        }

        const maxFileSize = 10 * 1024 * 1024; // 10MB
        const oversizedFiles = imageFiles.filter(f => f.size > maxFileSize);
        if (oversizedFiles.length > 0) {
            toast({
                title: "Files Too Large",
                description: "Some images exceed the 10MB limit. Please resize them.",
                variant: "destructive"
            });
            return;
        }

        setIsGrading(true);
        try {
            if (!user) {
                throw new Error("You must be logged in to grade cards.");
            }

            // 1. Get ID Token
            const token = await user.getIdToken();

            // 2. Upload Images to Storage (Solves Payload Limit)
            const uploadPath = `grading-temp/${user.uid}`;
            const uploadedUrls = await uploadImages(imageFiles.slice(0, 2), uploadPath);

            const frontImage = uploadedUrls[0];
            const backImage = uploadedUrls[1]; // undefined if only 1 uploaded

            // 3. Call AI Action with URLs and Token
            const result = await gradeCardDetailsAction({
                frontImageUrl: frontImage,
                backImageUrl: backImage,
                idToken: token
            });

            setGradingResult(result);

            if (result.condition && onGradeComplete) {
                onGradeComplete(result.condition);
            }

            toast({
                title: "Grading Complete!",
                description: `Overall Grade: ${result.overallGrade}/10 (${result.condition})`
            });

        } catch (error: any) {
            console.error('Grading error:', error);
            toast({
                title: "Grading Failed",
                description: error.message || "Could not analyze card. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGrading(false);
        }
    };

    const handleQuickAnalysis = async () => {
        if (imageFiles.length === 0) {
            toast({
                title: "No Images",
                description: "Please upload at least one photo of your card.",
                variant: "destructive"
            });
            return;
        }

        const maxFileSize = 10 * 1024 * 1024; // 10MB
        const oversizedFiles = imageFiles.filter(f => f.size > maxFileSize);
        if (oversizedFiles.length > 0) {
            toast({
                title: "Files Too Large",
                description: "Some images exceed the 10MB limit. Please resize them.",
                variant: "destructive"
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            if (!user) {
                throw new Error("You must be logged in to analyze cards.");
            }

            // 1. Get ID Token
            const token = await user.getIdToken();

            // 2. Upload Images
            const uploadPath = `grading-temp/${user.uid}`;
            const uploadedUrls = await uploadImages(imageFiles.slice(0, 3), uploadPath);

            // 3. Call AI Action
            const result = await suggestListingDetailsAction({
                photoUrls: uploadedUrls,
                idToken: token
            });

            setListingResult(result);

            toast({
                title: "Analysis Complete!",
                description: "AI suggestions are ready to apply."
            });

        } catch (error: any) {
            console.error('Analysis error:', error);
            toast({
                title: "Analysis Failed",
                description: error.message || "Could not analyze images. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applySuggestions = () => {
        if (listingResult) {
            onApplySuggestions(listingResult);
            toast({ title: "Suggestions Applied!" });
        }
    };

    return (
        <Card className="overflow-hidden border-2 border-indigo-100 shadow-xl bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black">AI Card Analysis Lab</CardTitle>
                        <CardDescription className="text-indigo-100">
                            Professional-grade analysis with detailed grading
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                        size="lg"
                        className="h-14 text-md font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all"
                        onClick={handleDetailedGrading}
                        disabled={isGrading || imageFiles.length === 0}
                    >
                        {isGrading ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Grading Card...</>
                        ) : (
                            <><ShieldCheck className="mr-2 h-5 w-5" />Detailed Grading</>
                        )}
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        className="h-14 text-md font-bold border-2 border-purple-200 hover:bg-purple-50 transition-all"
                        onClick={handleQuickAnalysis}
                        disabled={isAnalyzing || imageFiles.length === 0}
                    >
                        {isAnalyzing ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing...</>
                        ) : (
                            <><Sparkles className="mr-2 h-5 w-5 text-purple-600" />Quick Analysis</>
                        )}
                    </Button>
                </div>

                {/* Image Upload Guidance */}
                {imageFiles.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-900">Upload card images first</p>
                            <p className="text-amber-700 mt-1">For best results, upload front and back images of your card.</p>
                        </div>
                    </div>
                )}

                {imageFiles.length === 1 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold text-blue-900">Add back image for complete analysis</p>
                            <p className="text-blue-700 mt-1">Upload a second image of the card back for full grading accuracy.</p>
                        </div>
                    </div>
                )}

                {/* Grading Results */}
                {gradingResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        {/* Overall Grade */}
                        <div className={cn(
                            "rounded-xl p-6 border-2 text-center",
                            getGradeColor(gradingResult.overallGrade)
                        )}>
                            <div className="text-6xl font-black mb-2">{gradingResult.overallGrade}<span className="text-3xl">/10</span></div>
                            <div className="text-xl font-bold mb-2">{gradingResult.condition}</div>
                            <Badge variant="outline" className="text-sm">Overall Grade</Badge>
                        </div>

                        {/* Tabbed Analysis */}
                        <Tabs defaultValue="front" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="front">Front</TabsTrigger>
                                <TabsTrigger value="back">Back</TabsTrigger>
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                            </TabsList>

                            <TabsContent value="front" className="space-y-4 mt-4">
                                <GradingSection title="Corners" score={gradingResult.frontAnalysis.corners.score}>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-semibold">Top Left:</span> {gradingResult.frontAnalysis.corners.topLeft}</div>
                                        <div><span className="font-semibold">Top Right:</span> {gradingResult.frontAnalysis.corners.topRight}</div>
                                        <div><span className="font-semibold">Bottom Left:</span> {gradingResult.frontAnalysis.corners.bottomLeft}</div>
                                        <div><span className="font-semibold">Bottom Right:</span> {gradingResult.frontAnalysis.corners.bottomRight}</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{gradingResult.frontAnalysis.corners.notes}</p>
                                </GradingSection>

                                <GradingSection title="Centering" score={gradingResult.frontAnalysis.centering.score}>
                                    <div className="text-sm space-y-1">
                                        <div><span className="font-semibold">Left/Right:</span> {gradingResult.frontAnalysis.centering.leftRight}</div>
                                        <div><span className="font-semibold">Top/Bottom:</span> {gradingResult.frontAnalysis.centering.topBottom}</div>
                                        <p className="text-muted-foreground mt-2">{gradingResult.frontAnalysis.centering.notes}</p>
                                    </div>
                                </GradingSection>

                                <GradingSection title="Edges" score={gradingResult.frontAnalysis.edges.score}>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-semibold">Top:</span> {gradingResult.frontAnalysis.edges.top}</div>
                                        <div><span className="font-semibold">Right:</span> {gradingResult.frontAnalysis.edges.right}</div>
                                        <div><span className="font-semibold">Bottom:</span> {gradingResult.frontAnalysis.edges.bottom}</div>
                                        <div><span className="font-semibold">Left:</span> {gradingResult.frontAnalysis.edges.left}</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{gradingResult.frontAnalysis.edges.notes}</p>
                                </GradingSection>

                                <GradingSection title="Surface" score={gradingResult.frontAnalysis.surface.score}>
                                    <div className="text-sm space-y-1">
                                        <div><span className="font-semibold">Scratches:</span> {gradingResult.frontAnalysis.surface.scratches ? 'Present' : 'None detected'}</div>
                                        <div><span className="font-semibold">Print Lines:</span> {gradingResult.frontAnalysis.surface.printLines ? 'Visible' : 'None detected'}</div>
                                        <p className="text-muted-foreground mt-2">{gradingResult.frontAnalysis.surface.notes}</p>
                                    </div>
                                </GradingSection>
                            </TabsContent>

                            <TabsContent value="back" className="space-y-4 mt-4">
                                <GradingSection title="Corners" score={gradingResult.backAnalysis.corners.score}>
                                    <p className="text-sm text-muted-foreground">{gradingResult.backAnalysis.corners.notes}</p>
                                </GradingSection>

                                <GradingSection title="Centering" score={gradingResult.backAnalysis.centering.score}>
                                    <p className="text-sm text-muted-foreground">{gradingResult.backAnalysis.centering.notes}</p>
                                </GradingSection>

                                <GradingSection title="Edges" score={gradingResult.backAnalysis.edges.score}>
                                    <p className="text-sm text-muted-foreground">{gradingResult.backAnalysis.edges.notes}</p>
                                </GradingSection>

                                <GradingSection title="Surface" score={gradingResult.backAnalysis.surface.score}>
                                    <p className="text-sm text-muted-foreground">{gradingResult.backAnalysis.surface.notes}</p>
                                </GradingSection>
                            </TabsContent>

                            <TabsContent value="summary" className="space-y-4 mt-4">
                                {/* Strengths */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Strengths
                                    </h4>
                                    <ul className="space-y-1">
                                        {gradingResult.strengths.map((strength, idx) => (
                                            <li key={idx} className="text-sm text-emerald-800">• {strength}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Weaknesses */}
                                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                                    <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Weaknesses
                                    </h4>
                                    <ul className="space-y-1">
                                        {gradingResult.weaknesses.map((weakness, idx) => (
                                            <li key={idx} className="text-sm text-rose-800">• {weakness}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Recommendations */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-bold text-blue-900 mb-2">Recommendations</h4>
                                    <p className="text-sm text-blue-800">{gradingResult.recommendations}</p>
                                </div>

                                {/* Estimated Value */}
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Estimated Value
                                    </h4>
                                    <div className="text-2xl font-black text-amber-900 mb-1">
                                        ${formatPrice(gradingResult.estimatedValue.min)} - ${formatPrice(gradingResult.estimatedValue.max)} AUD
                                    </div>
                                    <p className="text-sm text-amber-800">{gradingResult.estimatedValue.notes}</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                {/* Listing Analysis Results */}
                {listingResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                                <span className="text-slate-600 font-bold uppercase text-xs tracking-widest">Quick Analysis</span>
                                <Button size="sm" onClick={applySuggestions} className="h-8">
                                    Apply All
                                </Button>
                            </div>

                            <div className="grid gap-2">
                                <SuggestionRow label="Title" value={listingResult.title} />
                                <SuggestionRow label="Price" value={`$${formatPrice(listingResult.price)} AUD`} />
                                <SuggestionRow label="Condition" value={listingResult.condition} />
                                <SuggestionRow label="Category" value={listingResult.category} />
                                {listingResult.year && <SuggestionRow label="Year" value={String(listingResult.year)} />}
                                {listingResult.manufacturer && <SuggestionRow label="Manufacturer" value={listingResult.manufacturer} />}
                            </div>

                            <div className="flex gap-2 text-xs text-slate-500 pt-2 items-center justify-center">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>AI Estimation • Review before publishing</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GradingSection({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-emerald-600 bg-emerald-50';
        if (score >= 7) return 'text-blue-600 bg-blue-50';
        if (score >= 5) return 'text-amber-600 bg-amber-50';
        return 'text-rose-600 bg-rose-50';
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900">{title}</h4>
                <Badge className={cn("font-bold", getScoreColor(score))}>
                    {score}/10
                </Badge>
            </div>
            {children}
        </div>
    );
}

function SuggestionRow({ label, value }: { label: string; value: string | undefined }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <h5 className="text-xs font-bold text-slate-500 uppercase">{label}</h5>
            <p className="text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}
