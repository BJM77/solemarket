import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, Activity, Target, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Club Fundraising | Benched',
  description: 'Donate your benched basketball shoes to support your club. Over half the sale value goes towards player fundraisers and events.',
};

export default function ClubFundraisingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Hero Section */}
      <section className="bg-green-600 text-white py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6 flex items-center gap-4">
              <Heart className="h-12 w-12 text-green-300" />
              Club Fundraising
            </h1>
            <p className="text-xl md:text-2xl text-green-50 leading-relaxed mb-8 font-medium">
              Don't throw out your benched basketball shoes. Donate them to support your local club.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/sell/create">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold px-8 h-14 text-lg rounded-xl">
                  Donate Your Shoes Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
            
            {/* Left Column */}
            <div className="space-y-8">
              <h2 className="text-3xl font-black uppercase tracking-tight">How It Works</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every season, players outgrow their basketball shoes or upgrade to a new pair, leaving perfectly good kicks sitting in the closet or destined for landfill. Our Club Fundraising program turns those benched shoes into direct funding for your stadium and players.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Donate Your Shoes</h3>
                    <p className="text-muted-foreground">Simply drop off your gently used basketball shoes at your participating local stadium or list them directly on Benched under your club's fundraising account.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">We Find a Buyer</h3>
                    <p className="text-muted-foreground">The shoes are authenticated and sold on the Benched marketplace to another player who needs them, promoting sustainability in the sport.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Funding Your Club</h3>
                    <p className="text-muted-foreground">Over half of the sale value is given directly back to the stadium to fund player events, equipment, court maintenance, and team trips.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column (Impact Stats) */}
            <div className="bg-white dark:bg-card rounded-3xl p-8 lg:p-12 shadow-xl border border-border/50 h-fit">
              <h2 className="text-2xl font-black uppercase tracking-tight mb-8">The Impact</h2>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <Target className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Over 50% Returns</h4>
                    <p className="text-muted-foreground">The majority of the value from every pair sold goes directly into your club's fundraising pool.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Activity className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Support Player Events</h4>
                    <p className="text-muted-foreground">Funds are used for end-of-season breakups, tournaments, new uniforms, and supporting disadvantaged players.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <ShieldCheck className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Eco-Friendly Sustainability</h4>
                    <p className="text-muted-foreground">Keep premium athletic footwear out of landfills and give them a second life on the court where they belong.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-8 border-t border-dashed">
                <h4 className="font-bold mb-4">Want to register your stadium?</h4>
                <p className="text-sm text-muted-foreground mb-6">If you are a stadium manager or club coordinator, get in touch with us to set up your official fundraising account.</p>
                <Link href="/contact">
                  <Button variant="outline" className="w-full font-bold h-12 rounded-xl">
                    Contact Us to Register
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
