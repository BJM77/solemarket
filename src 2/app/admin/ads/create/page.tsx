'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { uploadImages } from '@/lib/firebase/storage';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2, Upload } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    advertiserName: z.string().min(1, "Advertiser Name is required"),
    linkUrl: z.string().url("Must be a valid URL"),
    placement: z.enum(['home_hero_footer', 'grid_interstitial', 'drops_header']),
    startDate: z.string().min(1, "Start Date is required"),
    endDate: z.string().min(1, "End Date is required"),
});

export default function CreateAdPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            advertiserName: '',
            linkUrl: '',
            placement: 'home_hero_footer',
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!imageFile) {
            toast({ title: "Image required", description: "Please upload an ad creative.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload Image
            const imageUrls = await uploadImages([imageFile], 'ads');
            const imageUrl = imageUrls[0];

            // 2. Create Ad Document
            await addDoc(collection(db, 'ads'), {
                ...values,
                imageUrl,
                status: 'active',
                startDate: Timestamp.fromDate(new Date(values.startDate)),
                endDate: Timestamp.fromDate(new Date(values.endDate)),
                impressions: 0,
                clicks: 0,
                createdAt: serverTimestamp(),
            });

            toast({ title: "Campaign Created", description: "Ad is now live." });
            router.push('/admin/ads');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Create Campaign</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Campaign Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Summer Sale" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="advertiserName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Advertiser Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Foot Locker" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="placement"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Placement</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select placement" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="home_hero_footer">Home Page (Hero Footer)</SelectItem>
                                                <SelectItem value="grid_interstitial">Browse Grid (Interstitial)</SelectItem>
                                                <SelectItem value="drops_header">Drops Page (Header)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="linkUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Destination URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <FormLabel>Creative Image</FormLabel>
                                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                    />
                                    {imageFile ? (
                                        <div className="text-center">
                                            <p className="font-bold text-primary">{imageFile.name}</p>
                                            <p className="text-xs text-muted-foreground">Click to change</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm font-medium">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Launch Campaign
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
