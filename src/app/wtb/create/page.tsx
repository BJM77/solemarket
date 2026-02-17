import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WTBForm } from '@/components/wtb/WTBForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Create WTB Listing | Benched',
    description: 'Post a Wanted To Buy listing for collectibles you\'re actively seeking.',
};

export default function CreateWTBPage() {
    return (
        <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto max-w-3xl px-4">
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/wtb">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to WTB Listings
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline">Create WTB Listing</CardTitle>
                        <CardDescription>
                            Tell collectors what you're looking for. Only verified members can create listings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WTBForm mode="create" />
                    </CardContent>
                </Card>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold mb-2 text-sm">💡 Tips for Better Responses</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Be specific about what you want (grade, year, condition)</li>
                        <li>Upload a reference image if possible</li>
                        <li>Set a realistic maximum price</li>
                        <li>Include your general location for shipping context</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
