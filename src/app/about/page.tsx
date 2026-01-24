
import { PageHeader } from "@/components/layout/PageHeader";
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, MapPin, Sparkles, Handshake } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: 'About Picksy | Australia\'s Local Collectibles Marketplace',
  description: 'Picksy is Australia’s local marketplace for cards, coins & bullion. We are Perth-based with nationwide shipping, focused on trust and authenticity for Australian collectors.',
};

const principles = [
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Trust & Authenticity",
    description: "Every transaction is backed by our commitment to authenticity. With features like AI-powered grading and optional vault verification, we build a marketplace you can rely on."
  },
  {
    icon: <MapPin className="h-8 w-8 text-primary" />,
    title: "Local Focus, National Reach",
    description: "Proudly based in Perth, we provide a focused local hub for WA collectors while offering competitive nationwide shipping to connect communities across Australia."
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "AI-Powered Innovation",
    description: "We leverage cutting-edge AI to make listing easier, provide accurate pricing insights, and help you discover your next great find faster than ever before."
  },
    {
    icon: <Handshake className="h-8 w-8 text-primary" />,
    title: "By Collectors, For Collectors",
    description: "Picksy was founded by passionate collectors who understand the nuances of the hobby. Our platform is built with the features that matter most to you."
  }
]

export default function AboutPage() {
  return (
    <div className="bg-gray-50/50">
      <div className="container py-12 md:py-16">
        <PageHeader
          title="Our Story"
          description="Australia’s local marketplace for cards, coins & bullion — Perth-based, with nationwide shipping."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-8">
            <div className="prose lg:prose-lg max-w-none">
                <p>
                Picksy was born from a simple frustration shared by collectors across Australia: the existing options just weren&apos;t good enough. We were tired of navigating global platforms with exorbitant fees, unreliable international shipping, and a constant worry about authenticity. We believed Australian collectors deserved a dedicated, trustworthy, and modern marketplace.
                </p>
                <p>
                Our mission is to create that platform. From our home base in Perth, Western Australia, we&apos;re building a community-focused marketplace that leverages technology to solve the biggest problems in the hobby. We&apos;re connecting passionate sellers with discerning buyers, all within a framework of trust and security.
                </p>
                <p>
                Whether you&apos;re hunting for a rare pre-decimal coin, a graded Pokémon card, or the latest gold bullion, Picksy is your home for collecting in Australia.
                </p>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                <Image 
                    src="https://images.unsplash.com/photo-1583912268183-a34d4a132dc0?q=80&w=1740&auto=format&fit=crop"
                    alt="A collection of vintage items on a table"
                    fill
                    className="object-cover"
                    data-ai-hint="collecting vintage"
                />
            </div>
        </div>

        <div className="mt-16 md:mt-24">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Our Core Principles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {principles.map((p) => (
                    <Card key={p.title} className="text-center">
                        <CardHeader>
                            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                                {p.icon}
                            </div>
                            <CardTitle>{p.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
