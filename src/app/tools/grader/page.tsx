'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Info, AlertTriangle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EnhancedAICardGrader from '@/components/products/EnhancedAICardGrader';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function GraderToolPage() {
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (imageFiles.length + newFiles.length > 2) {
                toast({
                    title: "Too many images",
                    description: "Please upload a maximum of 2 images (Front & Back).",
                    variant: "destructive"
                });
                return;
            }

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImageFiles(prev => [...prev, ...newFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            // Revoke the URL to avoid memory leaks
            if (prev[index]) URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            <div className="container max-w-5xl mx-auto px-4 py-12">

                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">
                        AI Card Grader
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Get an instant AI assessment of your card's condition.
                    </p>
                </motion.header>

                {/* Educational Content & Disclaimers */}
                <div className="grid gap-6 mb-8 md:grid-cols-2">
                    <Card className="border-blue-100 bg-blue-50/50">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                What We Analyze
                            </h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li><strong>Corners:</strong> Sharpness, whitening, and wear.</li>
                                <li><strong>Edges:</strong> Chipping, roughness, and cuts.</li>
                                <li><strong>Centering:</strong> Top/bottom and left/right balance.</li>
                                <li><strong>Surface:</strong> Scratches, print lines, and creases.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-100 bg-amber-50/50">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Important Disclaimers
                            </h3>
                            <ul className="space-y-2 text-sm text-amber-800">
                                <li><strong>Estimation Only:</strong> AI grading is a tool for estimation and may make mistakes. It is not a guarantee of a professional grade.</li>
                                <li><strong>Image Quality Matters:</strong> The accuracy heavily depends on lighting and resolution. Use a stark background and avoid glare.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Upload Section */}
                <div className="mb-8">
                    {imageFiles.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-indigo-50 rounded-full">
                                    <Upload className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">Upload Card Images</p>
                                    <p className="text-slate-500">Drag & drop or click to upload (Front & Back)</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative w-40 h-56 flex-shrink-0 border rounded-lg overflow-hidden group">
                                    <Image
                                        src={preview}
                                        alt={`Card ${index + 1}`}
                                        fill
                                        className="object-contain bg-black/5"
                                    />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {imageFiles.length < 2 && (
                                <div className="w-40 h-56 flex-shrink-0 border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-slate-50 relative cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="text-center p-4">
                                        <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500 font-medium">Add Back Image</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Grader Component */}
                <EnhancedAICardGrader
                    imageFiles={imageFiles}
                    onGradeComplete={(grade) => {
                        console.log('Grading complete:', grade);
                    }}
                    onApplySuggestions={(suggestions) => {
                        toast({
                            title: "Analysis Complete",
                            description: "The AI has finished analyzing your card.",
                        });
                    }}
                />

            </div>
        </div>
    );
}
