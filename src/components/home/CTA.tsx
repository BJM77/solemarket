// components/home/CTA.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 text-center bg-gradient-to-r from-primary to-accent/80 p-12 rounded-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Level Up Your Sneaker Game?</h2>
        <p className="text-white/90 max-w-2xl mx-auto mb-8">Join thousands of sneakerheads who trust Benched for authentic kicks and sustainable shopping. Every second-hand purchase makes a difference.</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
            <Link href="/browse">Start Exploring</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-primary">
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
