import { getSellersAction } from '@/app/actions/seller-actions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShieldCheck, Store, ShoppingBag } from 'lucide-react';

export const metadata = {
    title: 'Our Sellers | Benched',
    description: 'Browse our community of verified sellers and their collections.',
};

export default async function SellersPage() {
    const sellers = await getSellersAction();

    return (
        <div className="container py-12 min-h-screen bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline mb-2">Our Sellers</h1>
                    <p className="text-muted-foreground">
                        Discover trusted shops and individual collectors on Benched.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/sell">Become a Seller</Link>
                </Button>
            </div>

            {sellers.length === 0 ? (
                <div className="text-center py-16">
                    <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">No sellers found yet</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">
                        It looks like we're just getting started. Be the first to list your items!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sellers.map((seller) => (
                        <Card key={seller.id} className="hover:shadow-lg transition-shadow duration-200 overflow-hidden border-orange-100/50">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-white pb-6 pt-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm bg-white">
                                        <AvatarImage src={seller.photoURL || ''} alt={seller.displayName || 'Seller'} />
                                        <AvatarFallback className="text-lg font-bold text-orange-600 bg-orange-50">
                                            {seller.displayName?.charAt(0) || 'S'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <h3 className="font-bold text-lg truncate" title={seller.storeName || seller.displayName}>
                                                {seller.storeName || seller.displayName}
                                            </h3>
                                            {seller.isVerified && (
                                                <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" aria-label="Verified Seller" />
                                            )}
                                        </div>
                                        {seller.storeName && seller.displayName && (
                                            <p className="text-sm text-muted-foreground truncate">{seller.displayName}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            Joined {(() => {
                                                const date = typeof seller.createdAt === 'string'
                                                    ? new Date(seller.createdAt)
                                                    : seller.createdAt && (seller.createdAt as any).seconds
                                                        ? new Date((seller.createdAt as any).seconds * 1000)
                                                        : null;

                                                return date && !isNaN(date.getTime())
                                                    ? date.toLocaleDateString()
                                                    : 'Recently';
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {/* Categories Section */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available Categories</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {seller.categories && seller.categories.length > 0 ? (
                                            seller.categories.slice(0, 5).map((category) => (
                                                <Badge key={category} variant="secondary" className="px-2.5 py-0.5 text-xs font-normal">
                                                    {category}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">No listed items yet</span>
                                        )}
                                        {seller.categories && seller.categories.length > 5 && (
                                            <Badge variant="outline" className="px-2 py-0.5 text-xs text-muted-foreground border-dashed">
                                                +{seller.categories.length - 5} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <ShoppingBag className="w-4 h-4 mr-1.5 text-gray-400" />
                                        <span>{seller.productCount}+ items</span>
                                    </div>
                                    <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                                        <Link href={`/seller/${seller.id}`}>
                                            Visit Shop
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
