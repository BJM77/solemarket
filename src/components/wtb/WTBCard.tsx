import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WantedListing } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, DollarSign, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WTBCardProps {
    listing: WantedListing;
}

export function WTBCard({ listing }: WTBCardProps) {
    const imageUrl = listing.imageUrl || '/wtb-wanted-placeholder.png';
    const conditionLabel = listing.desiredCondition === 'any'
        ? 'Any Condition'
        : listing.desiredCondition.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <Link href={`/wtb/${listing.id}`}>
            <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 h-full flex flex-col">
                <CardHeader className="p-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                        <Image
                            src={imageUrl}
                            alt={listing.title}
                            fill
                            priority
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {listing.status === 'fulfilled' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Badge className="text-lg px-4 py-2">Fulfilled</Badge>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 space-y-3">
                    <div>
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                            {listing.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {listing.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {listing.category && (
                            <Badge variant="secondary" className="text-xs">
                                {listing.category}
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            {conditionLabel}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{listing.location}</span>
                        </div>
                        <div className="flex items-center font-semibold text-primary">
                            <DollarSign className="w-4 h-4" />
                            <span>{listing.maxPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{listing.contactCount} {listing.contactCount === 1 ? 'contact' : 'contacts'}</span>
                    <span>
                        {listing.createdAt && typeof listing.createdAt === 'object' && 'toDate' in listing.createdAt
                            ? formatDistanceToNow(listing.createdAt.toDate(), { addSuffix: true })
                            : 'Recently'}
                    </span>
                </CardFooter>
            </Card>
        </Link>
    );
}
