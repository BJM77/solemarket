import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWTBListingById } from '@/app/actions/wtb';
import { ContactWTBForm } from '@/components/wtb/ContactWTBForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, DollarSign, Star, Calendar, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const { listing } = await getWTBListingById(id);

    if (!listing) {
        return {
            title: 'Listing Not Found | Picksy',
        };
    }

    return {
        title: `WTB: ${listing.title} | Picksy`,
        description: listing.description.substring(0, 160),
    };
}

export default async function WTBDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { listing, error } = await getWTBListingById(id);

    if (error || !listing) {
        notFound();
    }

    const imageUrl = listing.imageUrl || '/wtb-wanted-placeholder.png';
    const condition = listing.desiredCondition === 'any'
        ? 'Any Condition'
        : listing.desiredCondition.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto max-w-6xl px-4">
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/wtb">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to WTB Listings
                    </Link>
                </Button>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <CardTitle className="text-3xl font-headline mb-2">{listing.title}</CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            {listing.category && (
                                                <Badge variant="secondary">{listing.category}</Badge>
                                            )}
                                            {listing.status === 'fulfilled' && (
                                                <Badge className="bg-green-600">Fulfilled</Badge>
                                            )}
                                            {listing.status === 'cancelled' && (
                                                <Badge variant="destructive">Cancelled</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                                    <Image
                                        src={imageUrl}
                                        alt={listing.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 66vw"
                                        priority
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 text-lg">What they're looking for</h3>
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {listing.description}
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <DollarSign className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Maximum Price</p>
                                            <p className="font-semibold text-lg">${listing.maxPrice.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Star className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Desired Condition</p>
                                            <p className="font-semibold">{condition}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <MapPin className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Location</p>
                                            <p className="font-semibold">{listing.location}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <MessageCircle className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Contacts</p>
                                            <p className="font-semibold">{listing.contactCount} {listing.contactCount === 1 ? 'seller' : 'sellers'}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Buyer Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {listing.userPhotoURL ? (
                                        <Image
                                            src={listing.userPhotoURL}
                                            alt={listing.userDisplayName}
                                            width={48}
                                            height={48}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                            <span className="font-semibold text-primary">
                                                {listing.userDisplayName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold">{listing.userDisplayName}</p>
                                        <p className="text-sm text-muted-foreground">Verified Buyer</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        Posted {listing.createdAt && typeof listing.createdAt === 'object' && 'toDate' in listing.createdAt
                                            ? formatDistanceToNow(listing.createdAt.toDate(), { addSuffix: true })
                                            : 'recently'}
                                    </span>
                                </div>

                                {listing.status === 'active' && (
                                    <div className="pt-4">
                                        <ContactWTBForm listing={listing} />
                                    </div>
                                )}

                                {listing.status === 'fulfilled' && (
                                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm text-center text-green-700 dark:text-green-400">
                                        ✓ This listing has been fulfilled
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-base">About WTB Listings</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>• All buyers are verified members</p>
                                <p>• Messages are private and secure</p>
                                <p>• Both parties must be verified to communicate</p>
                                <p>• You can negotiate directly with the buyer</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
