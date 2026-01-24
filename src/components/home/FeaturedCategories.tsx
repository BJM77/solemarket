'use client';
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, CreditCard, ToyBrick, Gamepad2, Star, Footprints } from "lucide-react";

const staticCategories = [
    { name: 'Pokemon', href: '/browse?q=pokemon', icon: <Gamepad2 className="h-6 w-6" /> },
    { name: '$1 Coins', href: '/browse?q=%241+coin', icon: <Coins className="h-6 w-6" /> },
    { name: '$2 Coins', href: '/browse?q=%242+coin', icon: <Coins className="h-6 w-6" /> },
    { name: '50c Coins', href: '/browse?q=50c+coin', icon: <Coins className="h-6 w-6" /> },
    { name: 'Barbie', href: '/browse?q=barbie', icon: <ToyBrick className="h-6 w-6" /> },
    { name: 'NBA', href: '/browse?q=nba', icon: <CreditCard className="h-6 w-6" /> },
    { name: 'Rookies', href: '/browse?q=rookie', icon: <Star className="h-6 w-6" /> },
    { name: 'Shoes', href: '/browse?q=shoes', icon: <Footprints className="h-6 w-6" /> },
];

export default function FeaturedCategories() {
  return (
    <section className="py-16 container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore our carefully curated categories to find exactly what you're looking for
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {staticCategories.map((category) => (
            <Link key={category.name} href={category.href} className="h-full">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                    {category.icon}
                </div>
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-xs text-muted-foreground">Explore →</p>
                </CardContent>
            </Card>
            </Link>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <Button variant="outline" asChild>
          <Link href="/browse">View All Categories</Link>
        </Button>
      </div>
    </section>
  );
}
