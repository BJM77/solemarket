import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Calendar, Bell } from 'lucide-react';
import { AdUnit } from '@/components/ads/AdUnit';

// Mock Data for Drops - In a real app, this would come from Firestore 'drops' collection
const UPCOMING_DROPS = [
    {
        id: 'drop-1',
        title: 'Air Jordan 4 Retro "Military Blue"',
        date: '2026-05-04',
        price: 215,
        image: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?q=80&w=800',
        brand: 'Jordan'
    },
    {
        id: 'drop-2',
        title: 'Travis Scott x Air Jordan 1 Low OG "Olive"',
        date: '2026-05-18',
        price: 150,
        image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800',
        brand: 'Jordan'
    },
    {
        id: 'drop-3',
        title: 'Nike Kobe 6 Protro "Reverse Grinch"',
        date: '2026-06-15',
        price: 190,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800',
        brand: 'Nike'
    },
    {
        id: 'drop-4',
        title: 'Adidas Yeezy Boost 350 V2 "Zebra"',
        date: '2026-06-22',
        price: 230,
        image: 'https://images.unsplash.com/photo-1520256862855-398228c41684?q=80&w=800',
        brand: 'Yeezy'
    },
    {
        id: 'drop-5',
        title: 'New Balance 990v6 "Grey"',
        date: '2026-07-01',
        price: 200,
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=800',
        brand: 'New Balance'
    }
];

export const metadata = {
    title: 'Release Calendar | Benched',
    description: 'Upcoming sneaker releases in Australia. Stay ahead of the game.',
};

export default function DropsPage() {
    return (
        <div className="container mx-auto py-12 px-4 min-h-screen">
            <PageHeader
                title="Release Calendar"
                description="Upcoming heat dropping soon. Set your reminders."
            />

            <div className="mt-8 mb-8">
                <AdUnit placement="drops_header" className="aspect-[4/1]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {UPCOMING_DROPS.map((drop) => (
                    <Card key={drop.id} className="overflow-hidden group hover:shadow-xl transition-all border-none bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800">
                        <div className="aspect-square relative bg-muted/30 p-0 overflow-hidden">
                            <Image
                                src={drop.image}
                                alt={drop.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-4 left-4 bg-black/90 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 backdrop-blur-md shadow-xl z-10">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(drop.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <div className="mb-4">
                                <p className="text-primary font-bold text-xs uppercase tracking-wider mb-1">{drop.brand}</p>
                                <h3 className="font-black text-lg leading-tight line-clamp-2">{drop.title}</h3>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-dashed">
                                <div>
                                    <span className="text-xs text-muted-foreground block font-medium">Retail</span>
                                    <span className="font-bold text-lg">${drop.price}</span>
                                </div>
                                <Button size="sm" className="rounded-full font-bold px-4 shadow-lg shadow-primary/20">
                                    <Bell className="w-3.5 h-3.5 mr-2" /> Notify Me
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
