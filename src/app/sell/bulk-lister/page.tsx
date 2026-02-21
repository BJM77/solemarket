'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Image as ImageIcon, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadMedia } from '@/lib/firebase/storage';
import { createProductAction } from '@/app/actions/products';
import { useUserPermissions } from '@/hooks/use-user-permissions';

interface PendingUpload {
    id: string;
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
    progress: number;
    error?: string;
    productId?: string;
}

export default function BulkImageListerPage() {
    const { user } = useUser();
    const { isSuperAdmin, canSell, isLoading: isPermissionsLoading } = useUserPermissions();
    const router = useRouter();
    const [uploads, setUploads] = useState<PendingUpload[]>([]);
    const [isProcessingAll, setIsProcessingAll] = useState(false);

    // Only allow verified business sellers or super admins to use bulk tools
    const hasAccess = isSuperAdmin || canSell;

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newUploads = acceptedFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            status: 'pending' as const,
            progress: 0
        }));
        setUploads(prev => [...prev, ...newUploads]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxSize: 20 * 1024 * 1024, // 20MB
    });

    const removeUpload = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    const processItem = async (upload: PendingUpload) => {
        if (!user) return;

        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'uploading', progress: 10 } : u));

        try {
            // 1. Upload Image to Storage
            const idToken = await user.getIdToken();
            const imageUrls = await uploadMedia([upload.file]);
            const imageUrl = imageUrls[0];

            setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'processing', progress: 50 } : u));

            // 2. Call Create Product Action with just the image (AI handles the rest)
            // We pass a generic title, AI Pipeline will likely overwrite it based on analysis
            const result = await createProductAction(idToken, {
                title: 'Draft from Image Upload',
                description: 'Auto-generated draft.',
                category: 'Trading Cards', // Default assumption for MVP, can be adjusted
                condition: 'Near Mint', // Default
                price: 0,
                imageUrls: [imageUrl],
                status: 'draft' // Create as draft
            });

            if (result.success) {
                setUploads(prev => prev.map(u => u.id === upload.id ? {
                    ...u,
                    status: 'success',
                    progress: 100,
                    productId: result.productId
                } : u));
            } else {
                throw new Error(result.error);
            }

        } catch (error: any) {
            console.error('Processing failed for item:', error);
            setUploads(prev => prev.map(u => u.id === upload.id ? {
                ...u,
                status: 'error',
                error: error.message || 'Upload failed'
            } : u));
        }
    };

    const processAll = async () => {
        setIsProcessingAll(true);
        const pendingItems = uploads.filter(u => u.status === 'pending' || u.status === 'error');

        for (const item of pendingItems) {
            await processItem(item);
        }
        setIsProcessingAll(false);
    };

    if (isPermissionsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
    if (!hasAccess) return <div className="p-8 text-center text-red-500">Access Denied: Business Seller or Super Admin required.</div>;

    return (
        <div className="container max-w-5xl mx-auto py-8 space-y-8">
            <PageHeader
                title="Bulk Image Lister"
                description="Drop images here. We'll extract details and create draft listings automatically."
            />

            {/* Dropzone */}
            <Card className="border-2 border-dashed bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <CardContent className="p-0">
                    <div
                        {...getRootProps()}
                        className={`p-12 text-center cursor-pointer flex flex-col items-center justify-center min-h-[300px] transition-colors ${isDragActive ? 'bg-primary/5 border-primary' : ''
                            }`}
                    >
                        <input {...getInputProps()} />
                        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                            <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {isDragActive ? 'Drop images here...' : 'Drag & drop item photos'}
                        </h3>
                        <p className="text-slate-500 mb-6">
                            Upload photos of your items. Our AI will analyze them and generate draft listings.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>Supports JPG, PNG, WEBP</span>
                            <span>•</span>
                            <span>Max 20MB per file</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Queue */}
            {uploads.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            Upload Queue ({uploads.length})
                        </h3>
                        <Button
                            onClick={processAll}
                            disabled={isProcessingAll || uploads.every(u => u.status === 'success')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isProcessingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
                                    Auto-Draft All with AI
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {uploads.map((upload) => (
                            <Card key={upload.id} className="overflow-hidden group relative">
                                <div className="aspect-square relative bg-slate-100">
                                    <img
                                        src={upload.preview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Overlay Status */}
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm transition-opacity ${upload.status === 'pending' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                                        }`}>
                                        {upload.status === 'pending' && (
                                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => removeUpload(upload.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {upload.status === 'uploading' && <Loader2 className="h-6 w-6 text-white animate-spin" />}
                                        {upload.status === 'processing' && <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />}
                                        {upload.status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-400" />}
                                    </div>

                                    {/* Progress Bar */}
                                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${upload.progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 bg-white">
                                    <div className="text-xs truncate font-medium text-slate-700" title={upload.file.name}>
                                        {upload.file.name}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="text-[10px] text-slate-400 capitalize">
                                            {upload.status === 'error' ? (
                                                <span className="text-red-500 truncate" title={upload.error}>{upload.error}</span>
                                            ) : upload.status}
                                        </div>
                                        {upload.status === 'success' && upload.productId && (
                                            <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={() => router.push(`/sell/listings`)}>
                                                Edit Draft Config
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
