import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Calendar, Bell } from 'lucide-react';
import { AdUnit } from '@/components/ads/AdUnit';

// Mock Data for Card Drops
const UPCOMING_DROPS = [
    {
        id: 'card-drop-1',
        title: '2025-26 Panini Prizm Basketball Hobby Box',
        date: '2026-05-15',
        price: 850,
        image: 'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?q=80&w=800',
        brand: 'Panini'
    },
    {
        id: 'card-drop-2',
        title: 'Topps Chrome UFC 2026 Showcase',
        date: '2026-05-22',
        price: 320,
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800',
        brand: 'Topps'
    },
    {
        id: 'card-drop-3',
        title: 'Upper Deck Series 2 Hockey 2026',
        date: '2026-06-05',
        price: 150,
        image: 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=800',
        brand: 'Upper Deck'
    },
    {
        id: 'card-drop-4',
        title: 'Pokémon TCG: Scarlet & Violet - Obsidian Flames 2',
        date: '2026-06-18',
        price: 160,
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=800',
        brand: 'Pokémon'
    }
];

export const metadata = {
    title: 'Card Release Calendar | Benched',
    description: 'Upcoming sports and TCG card releases in Australia. Secure the box.',
};

export default function CardDropsPage() {
    return (
        <div className="container mx-auto py-12 px-4 min-h-screen">
            <PageHeader
                title="Card Release Calendar"
                description="Upcoming wax and sets dropping soon. Don't miss out."
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
