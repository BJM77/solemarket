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
            <Card className="group bg-white/5 border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all duration-500 h-full flex flex-col overflow-hidden backdrop-blur-sm rounded-3xl">
                <CardHeader className="p-0">
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                        <Image
                            src={imageUrl}
                            alt={listing.title}
                            fill
                            priority
                            className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute top-4 left-4">
                            <Badge className="bg-primary text-black font-black italic border-none shadow-lg">
                                WTB
                            </Badge>
                        </div>
                        {listing.status === 'fulfilled' && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-[2px]">
                                <Badge className="text-xl px-6 py-3 bg-green-500 text-black font-black italic">FULFILLED</Badge>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 space-y-4">
                    <div>
                        <CardTitle className="text-xl font-bold italic line-clamp-1 group-hover:text-primary transition-colors duration-300">
                            {listing.title}
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {listing.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {listing.category && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-white/10 text-slate-500">
                                {listing.category}
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-white/10 text-slate-500">
                            <Star className="w-3 h-3 mr-1 text-primary" />
                            {conditionLabel}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                            <MapPin className="w-3 h-3 mr-1.5 text-primary" />
                            <span>{listing.location}</span>
                        </div>
                        <div className="flex items-center text-xl font-black italic text-primary">
                            <span className="text-sm mr-0.5">$</span>
                            <span>{listing.maxPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    <span>{listing.contactCount} {listing.contactCount === 1 ? 'OFFER' : 'OFFERS'}</span>
                    <span>
                        {listing.createdAt && typeof listing.createdAt === 'object' && 'toDate' in listing.createdAt
                            ? formatDistanceToNow(listing.createdAt.toDate(), { addSuffix: true })
                            : 'RECENTLY'}
                    </span>
                </CardFooter>
            </Card>
        </Link>
    );
}
