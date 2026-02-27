'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { WantedListing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { createWTBListing, updateWTBListing } from '@/app/actions/wtb';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

const wtbSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    maxPrice: z.string().min(1, 'Price is required'),
    desiredCondition: z.enum(['mint', 'near-mint', 'excellent', 'good', 'fair', 'any']),
    location: z.string().min(2, 'Location is required'),
});

type WTBFormValues = z.infer<typeof wtbSchema>;

interface WTBFormProps {
    listing?: WantedListing;
    mode?: 'create' | 'edit';
}

export function WTBForm({ listing, mode = 'create' }: WTBFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(listing?.imageUrl || null);
    const [uploading, setUploading] = useState(false);

    const form = useForm<WTBFormValues>({
        resolver: zodResolver(wtbSchema),
        defaultValues: {
            title: listing?.title || '',
            description: listing?.description || '',
            category: listing?.category || '',
            maxPrice: listing?.maxPrice?.toString() || '',
            desiredCondition: listing?.desiredCondition || 'any',
            location: listing?.location || '',
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: 'Image too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return imagePreview;

        setUploading(true);
        try {
            const fileRef = storageRef(storage, `wtb-images/${Date.now()}_${imageFile.name}`);
            await uploadBytes(fileRef, imageFile);
            const downloadURL = await getDownloadURL(fileRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            toast({ title: 'Upload failed', description: 'Failed to upload image', variant: 'destructive' });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (values: WTBFormValues) => {
        setIsSubmitting(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) {
                toast({ title: 'Not authenticated', variant: 'destructive' });
                router.push('/sign-in');
                return;
            }

            // Upload image if new one selected
            const imageUrl = await uploadImage();

            const wtbData = {
                ...values,
                maxPrice: parseFloat(values.maxPrice),
                imageUrl: imageUrl || undefined,
            };

            let result;
            if (mode === 'edit' && listing) {
                result = await updateWTBListing(listing.id, wtbData, idToken);
            } else {
                result = await createWTBListing({
                    ...wtbData,
                    userDisplayName: 'User', // Will be set by server
                    userPhotoURL: undefined,
                } as any, idToken);
            }

            if (result.success) {
                toast({
                    title: mode === 'edit' ? 'Updated!' : 'Created!',
                    description: mode === 'edit' ? 'Your WTB listing has been updated.' : 'Your WTB listing is now live.',
                });
                router.push('/wtb');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save WTB listing',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload */}
                <FormItem>
                    <FormLabel>Image (Optional)</FormLabel>
                    <FormDescription>Upload an image of what you're looking for</FormDescription>
                    <FormControl>
                        <div className="space-y-4">
                            {imagePreview && (
                                <div className="relative w-full max-w-md">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        width={400}
                                        height={300}
                                        style={{ width: 'auto', height: 'auto' }}
                                        className="rounded-lg object-cover"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="h-12 sm:h-10"
                            />
                        </div>
                    </FormControl>
                </FormItem>

                {/* Title */}
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>What are you looking for?</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 1952 Topps Mickey Mantle PSA 8" className="h-12 sm:h-10" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what you're looking for, any specific details, why you want it, etc."
                                    className="resize-none h-32"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Category */}
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 sm:h-10">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="sneakers">Sneakers</SelectItem>
                                    <SelectItem value="accessories">Accessories</SelectItem>
                                    <SelectItem value="cards">Collector Cards</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Max Price */}
                    <FormField
                        control={form.control}
                        name="maxPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Maximum Price ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1000" className="h-12 sm:h-10" {...field} />
                                </FormControl>
                                <FormDescription>What's the most you'll pay?</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Desired Condition */}
                    <FormField
                        control={form.control}
                        name="desiredCondition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Desired Condition</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 sm:h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="mint">Mint</SelectItem>
                                        <SelectItem value="near-mint">Near Mint</SelectItem>
                                        <SelectItem value="excellent">Excellent</SelectItem>
                                        <SelectItem value="good">Good</SelectItem>
                                        <SelectItem value="fair">Fair</SelectItem>
                                        <SelectItem value="any">Any Condition</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Location */}
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Location</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Melbourne, VIC" className="h-12 sm:h-10" {...field} />
                            </FormControl>
                            <FormDescription>General area (helps sellers gauge shipping)</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Submit */}
                <Button type="submit" className="w-full h-12" disabled={isSubmitting || uploading}>
                    {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'edit' ? 'Update Listing' : 'Create WTB Listing'}
                </Button>
            </form>
        </Form>
    );
}
