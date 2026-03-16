import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, ShieldCheck, Repeat, DollarSign } from "lucide-react";
import { brandConfig } from "@/config/brand";
import competitors from "@/content/conquesting/competitors.json";

interface Props {
  params: Promise<{ competitor: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { competitor: slug } = await params;
  const competitor = (competitors as any)[slug];

  if (!competitor) return { title: "Page Not Found" };

  return {
    title: `Shopping at ${competitor.name}? | Fund it by Selling on ${brandConfig.company.name}`,
    description: `Upgrade your rotation at ${competitor.name} by selling your pre-loved sneakers on ${brandConfig.company.name}. 0% seller fees for new users.`,
  };
}

export default async function ConquestingPage({ params }: Props) {
  const { competitor: slug } = await params;
  const competitor = (competitors as any)[slug];

  if (!competitor) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 self-center lg:self-start px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5 fill-primary" />
                The Smarter Way to Shop at {competitor.name}
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
                Love your new gear <br />
                <span className="text-primary tracking-tighter italic">Sell the old for free</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {competitor.message}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Button asChild size="lg" className="h-14 px-8 rounded-full text-lg font-bold shadow-xl shadow-primary/20 group">
                  <Link href="/sell/create">
                    Start Selling Now
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-lg font-bold">
                  <Link href="/browse">
                    Browse Marketplace
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                <div className="flex flex-col items-center lg:items-start gap-1">
                  <span className="text-2xl font-bold">0%</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Seller Fees</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center lg:items-start gap-1">
                  <span className="text-2xl font-bold">Fast</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payouts</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center lg:items-start gap-1">
                  <span className="text-2xl font-bold">Local</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Australia</span>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <div className="relative bg-white dark:bg-gray-900 border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
                <div className="aspect-[4/3] relative">
                  <Image 
                    src={competitor.heroImage} 
                    alt={`Upgrade from ${competitor.name}`}
                    fill
                    className="object-contain p-12 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Float Badge */}
              <div className="absolute -top-6 -right-6 bg-accent text-accent-foreground p-6 rounded-2xl shadow-xl transform rotate-3 border-4 border-background animate-bounce-subtle">
                <span className="block text-3xl font-black">$0</span>
                <span className="block text-[10px] uppercase font-bold tracking-tighter">Selling Fees</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Prop Grid */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Why Sell on {brandConfig.company.name}?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're the smartest way to fund your collection. Join thousands of Australian collectors.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background border border-border/50 p-10 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Zero Seller Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Keep 100% of your sale price. No hidden listing fees or final value cuts for first-time sellers.
              </p>
            </div>

            <div className="bg-background border border-border/50 p-10 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Safe & Secure</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our Australian-based escrow system protects both buyers and sellers. Get paid as soon as items arrive.
              </p>
            </div>

            <div className="bg-background border border-border/50 p-10 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Repeat className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Eco-Friendly</h3>
              <p className="text-muted-foreground leading-relaxed">
                Give your gear a second life. Reduce waste and keep the sneaker culture sustainable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary to-accent opacity-90 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 relative text-center text-primary-foreground">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
            Ready to upgrade your collection?
          </h2>
          <p className="text-xl md:text-2xl opacity-90 mb-12 font-medium max-w-2xl mx-auto">
            Join the Benched community today and turn your pre-loved sneakers into your next big purchase.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="h-16 px-10 rounded-full text-xl font-bold shadow-2xl">
              <Link href="/sell/create">
                List Your Items Now
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm opacity-75 font-bold uppercase tracking-widest">
            Takes less than 60 seconds to list
          </p>
        </div>
      </section>
    </div>
  );
}
