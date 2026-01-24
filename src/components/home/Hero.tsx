import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero({ productCount, error }: { productCount: number | null, error: string | null }) {
  const count = productCount ?? 0;
  return (
    <section className="bg-gray-50/50 dark:bg-background">
      <div className="container mx-auto px-4 py-16 text-center lg:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Discover Rare Finds & Unique Collectibles
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Picksy is the premier marketplace for collectors, with over {count.toLocaleString()} items to discover. Buy, sell, and trade verified collectibles with complete confidence.
        </p>
        <div className="mt-10 flex justify-center gap-x-6">
          <Button asChild size="lg">
            <Link href="/browse">Start Exploring</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/consign">Sell with Us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
