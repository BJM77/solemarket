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
            title: 'Listing Not Found | Benched',
        };
    }

    return {
        title: `WTB: ${listing.title} | Benched`,
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
        <div className="min-h-screen bg-black text-white py-12">
            <div className="container mx-auto max-w-6xl px-6">
                <Button variant="ghost" asChild className="mb-10 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <Link href="/wtb">
                        <ArrowLeft className="mr-3 h-5 w-5" />
                        Back to requests
                    </Link>
                </Button>

                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-10">
                        <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex flex-col gap-6 mb-8">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {listing.category && (
                                                <Badge className="bg-primary text-black font-black italic rounded-lg tracking-tighter">
                                                    {listing.category.toUpperCase()}
                                                </Badge>
                                            )}
                                            {listing.status === 'fulfilled' && (
                                                <Badge className="bg-green-500 text-black font-black italic">FULFILLED</Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-4xl md:text-5xl font-black italic tracking-tight">{listing.title}</CardTitle>
                                    </div>
                                </div>

                                <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5">
                                    <Image
                                        src={imageUrl}
                                        alt={listing.title}
                                        fill
                                        className="object-cover opacity-90"
                                        sizes="(max-width: 768px) 100vw, 66vw"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 space-y-10">
                                <div>
                                    <h3 className="text-xl font-black italic mb-4 text-primary uppercase tracking-widest">Description.</h3>
                                    <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                        {listing.description}
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-6 p-8 bg-white/5 rounded-[2rem] border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                            <DollarSign className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Max Budget</p>
                                            <p className="font-black text-2xl italic tracking-tighter">${listing.maxPrice.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                            <Star className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Condition</p>
                                            <p className="font-black text-xl italic tracking-tighter uppercase">{condition}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                            <MapPin className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Location</p>
                                            <p className="font-black text-xl italic tracking-tighter">{listing.location}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                            <MessageCircle className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Interest</p>
                                            <p className="font-black text-xl italic tracking-tighter">{listing.contactCount} Sellers</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-10">
                        <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[2.5rem]">
                            <CardHeader className="p-8">
                                <CardTitle className="text-xl font-black italic tracking-widest uppercase text-slate-400">Buyer Profile.</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="flex items-center gap-5 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    {listing.userPhotoURL ? (
                                        <Image
                                            src={listing.userPhotoURL}
                                            alt={listing.userDisplayName}
                                            width={60}
                                            height={60}
                                            className="rounded-xl border-2 border-primary/50"
                                        />
                                    ) : (
                                        <div className="h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20">
                                            <span className="font-black text-2xl text-primary">
                                                {listing.userDisplayName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-black text-lg italic">{listing.userDisplayName}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            <p className="text-[10px] font-black tracking-widest text-blue-500 uppercase">Verified Member</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40 p-3 rounded-lg border border-white/5">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span>
                                        Demanded {listing.createdAt && typeof listing.createdAt === 'object' && 'toDate' in listing.createdAt
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
                                    <div className="p-5 bg-green-500/10 rounded-2xl border border-green-500/20 text-sm font-black italic text-center text-green-500 uppercase tracking-widest">
                                        ✓ This Demand has been met
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-dashed">
                            <CardHeader className="p-8">
                                <CardTitle className="text-xl font-black italic tracking-widest uppercase text-slate-400">Protocols.</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] space-y-4">
                                <div className="flex gap-4">
                                    <span className="text-primary">01</span>
                                    <p>Identity is strictly verified for all participants.</p>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-primary">02</span>
                                    <p>Communications are end-to-end encrypted.</p>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-primary">03</span>
                                    <p>Direct negotiation permitted through Benched.</p>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-primary">04</span>
                                    <p>Escrow payment via DealSafe is recommended.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
