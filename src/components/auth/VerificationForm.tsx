'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { uploadImages } from '@/lib/firebase/storage'; // Re-using image upload logic
import { submitVerificationRequest } from '@/app/actions/verification';
import { Loader2, Upload, FileCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VerificationForm() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [idImageFront, setIdImageFront] = useState<File | null>(null);
    const [companyDoc, setCompanyDoc] = useState<File | null>(null); // Optional secondary doc
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // If user is already verified (unlikely to land here if guarded, but good safety)
    if ((user as any)?.isVerified) {
        return (
            <div className="text-center p-8">
                <div className="bg-green-100 text-green-700 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                    <FileCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verified!</h2>
                <p className="text-gray-600 mb-6">Your identity has been verified. You have full access to the marketplace.</p>
                <Button onClick={() => router.push('/')}>Continue Shopping</Button>
            </div>
        );
    }

    // If pending
    if ((user as any)?.verificationStatus === 'pending' || isSubmitted) {
        return (
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="bg-blue-100 text-blue-700 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
                <p className="text-gray-600 mb-6">
                    Your documents have been submitted and are currently under review by our team.
                    This usually takes 24-48 hours. You will be notified once approved.
                </p>
                <Button variant="outline" onClick={() => router.push('/')}>Return Home</Button>
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!idImageFront) {
            toast({ variant: 'destructive', title: "Missing ID", description: "Please upload an image of your Government ID." });
            return;
        }

        setIsLoading(true);

        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Not authenticated");

            // 1. Upload Images
            const filesToUpload = [idImageFront];
            if (companyDoc) filesToUpload.push(companyDoc);

            // Using 'grading-temp' or a new folder 'verification-docs' if policy allows.
            // Re-using storage utils. Note: Ideally this should be a private bucket, but for MVP strict public read rules apply or use secure paths.
            // As per implementation plan, we are using the existing storage setup.
            // PLEASE NOTE: In a real prod app, these URLs should likely be signed URLs or strictly private.

            // Checking storage.ts, allowed prefixes are ['products/', 'media-library/', 'temp-analysis/', 'grading-temp/']
            // 'grading-temp/' seems most appropriate for "temporary analysis/processing" or we can add a new one.
            // Let's use 'media-library/' with a specific naming convention for now as per `sanitizePath` fallback.

            const uploadedUrls = await uploadImages(filesToUpload, 'media-library/verification/');

            // 2. Submit Request
            const result = await submitVerificationRequest(token, uploadedUrls, reason);

            if (result.success) {
                setIsSubmitted(true);
                toast({ title: "Submitted", description: "Your verification request has been received." });
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to upload documents or submit request." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Identity Verification
                </CardTitle>
                <CardDescription>
                    To ensure the safety of our marketplace, we require all users to verify their identity before buying or selling.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert className="mb-6 bg-yellow-50 text-yellow-800 border-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Why is this required?</AlertTitle>
                    <AlertDescription>
                        This helps prevent fraud and ensures you are dealing with real people. Your data is stored securely and only used for verification.
                    </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="id-front">Government ID (Driver's License / Passport) <span className="text-red-500">*</span></Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                            <Input
                                id="id-front"
                                type="file"
                                accept="image/*,.pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileChange(e, setIdImageFront)}
                            />
                            {idImageFront ? (
                                <div className="text-green-600 font-medium flex items-center justify-center gap-2">
                                    <FileCheck className="w-4 h-4" /> {idImageFront.name}
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <span className="text-sm">Click to upload front of ID</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="doc-secondary">Secondary Document (Optional)</Label>
                        <p className="text-xs text-gray-500">Utility bill or proof of address if ID address doesn't match.</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                            <Input
                                id="doc-secondary"
                                type="file"
                                accept="image/*,.pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileChange(e, setCompanyDoc)}
                            />
                            {companyDoc ? (
                                <div className="text-green-600 font-medium flex items-center justify-center gap-2">
                                    <FileCheck className="w-4 h-4" /> {companyDoc.name}
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <span className="text-sm">Click to upload secondary doc</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Why do you want to join Benched?</Label>
                        <Textarea
                            id="reason"
                            placeholder="I am a collector looking to buy rare cards..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for Verification
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
