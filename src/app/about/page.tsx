
import { PageHeader } from "@/components/layout/PageHeader";
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, MapPin, Sparkles, Handshake, Leaf } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: 'About Benched | Australia\'s Premier Sneaker Marketplace',
  description: 'Benched is Australia\'s local marketplace for authentic sneakers and streetwear. Perth-based with nationwide shipping, focused on trust and authenticity for sneakerheads.',
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
    description: "We leverage cutting-edge AI to make listing easier, provide accurate pricing insights, and help you discover your next grail faster than ever before."
  },
  {
    icon: <Handshake className="h-8 w-8 text-primary" />,
    title: "By Sneakerheads, For Sneakerheads",
    description: "Benched was founded by passionate sneaker collectors who understand the culture. Our platform is built with the features that matter most to you."
  },
  {
    icon: <Leaf className="h-8 w-8 text-primary" />,
    title: "Sustainable Sneaker Culture",
    description: "Every pair of second-hand sneakers bought prevents ~14kg of CO₂ emissions and saves thousands of liters of water. Join us in building a more sustainable sneaker community."
  }
]

export default function AboutPage() {
  return (
    <div className="bg-gray-50/50">
      <div className="container py-12 md:py-16">
        <PageHeader
          title="Our Story"
          description="Australia's premier marketplace for authentic sneakers and streetwear — Perth-based, with nationwide shipping."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-8">
          <div className="prose lg:prose-lg max-w-none">
            <p>
              Benched was born from a simple frustration shared by hoopers across Australia: performance sneakers always have more game left in them. We were tired of seeing pristine Kobes, LeBrons, and KDs gathering dust or being sold on platforms that didn't understand the court.
            </p>
            <p>
              Our mission is to create the ultimate locker room for your rotation. From our home base in Perth, Western Australia, we're building a community-focused marketplace that connects players. Whether it's a pair that didn't fit right or a rotation piece you're ready to sub out, Benched is where they find their second half.
            </p>
            <p>
              Whether you're hunting for that specific colorway for game day or offloading a pair from your lineup, Benched is the safest way to keep the game going.
            </p>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
            <Image
              src="https://images.unsplash.com/photo-1556906781-9cba4df61aa3?q=80&w=1740&auto=format&fit=crop"
              alt="Authentic sneakers collection"
              fill
              className="object-cover"
              data-ai-hint="sneaker collection"
            />
          </div>
        </div>

        <div className="mt-16 md:mt-24">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">Our Core Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
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
