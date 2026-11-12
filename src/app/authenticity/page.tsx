import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, SearchCode, ShieldCheck, Fingerprint } from "lucide-react";
import FAQSchema from "@/components/seo/FAQSchema";

export const metadata: Metadata = {
    title: 'Authenticity and integrity',
    description: 'How authenticity works on Benched: seller responsibility, PSA cert lookups, inspecting on pickup, and how to report a problem.',
    alternates: { canonical: '/authenticity' },
};

const authenticityFaqs = [
  {
    question: "Does Benched authenticate items?",
    answer: "No. Benched is a peer-to-peer marketplace and does not physically inspect or authenticate items before they are listed or sold. Sellers are responsible for the accuracy of their listings, including authenticity. Buyers pay the seller directly by PayID or cash on pickup."
  },
  {
    question: "What does a PSA cert check show?",
    answer: "If a seller provides a PSA certification number, we may look that number up in PSA's records, or show a cached result, so you can compare the cert details with the listing photos. That check only confirms the number exists in PSA's database. It does not confirm that the physical card being sold is that same card, and it is not a Benched authentication. Live lookups can be requested by the listing owner or an admin."
  },
  {
    question: "What happens if I receive a fake item?",
    answer: "Benched doesn't hold payments, so for high-value items we recommend cash on pickup in Perth, where you inspect the item before paying. If a PayID purchase arrives fake or is not as described, report it from your order page or the contact page. We may remove the listing, end the seller's account, and block the associated mobile number."
  },
  {
    question: "Can anyone sell on Benched?",
    answer: "Sellers are approved before they can list. Selling counterfeit or replica items is prohibited and can lead to the listing being removed, the account being ended, and the mobile number being blocked sitewide."
  }
];

export default function AuthenticityPage() {
    return (
        <div className="bg-background min-h-screen text-foreground pb-20">
            <FAQSchema questions={authenticityFaqs} />
            <PageHeader
                title="Authenticity and integrity"
                description="Benched is a peer-to-peer marketplace. We do not physically authenticate items."
            />

            <div className="container mx-auto px-4 mt-12 max-w-5xl">
                <div className="mb-16">
                    <h2 className="text-3xl font-black mb-6">How authenticity works here</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                        The collectible market—especially sneakers and cards—includes replicas. Benched does not inspect items before they are listed or sold, and we do not hold payments.
                        Sellers must describe condition and authenticity accurately. Buyers should check photos, ask questions, and for higher-value purchases consider cash on pickup in Perth so they can inspect the item before paying.
                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Counterfeit and replica goods are prohibited. See our <Link href="/prohibited-items" className="underline font-semibold text-foreground">Prohibited Items Policy</Link> and <Link href="/terms" className="underline font-semibold text-foreground">Terms of Service</Link>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <Card className="bg-card border-border hover:border-orange-500/50 transition-colors">
                        <CardContent className="p-8">
                            <SearchCode className="h-12 w-12 text-orange-700 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">1. PSA cert lookup</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                For a graded card, if the seller provides a PSA certification number, we can look that number up in PSA&apos;s records (or show a previously cached result) so you can compare the cert details with the photos. This confirms the number exists in PSA&apos;s database. It does not confirm the card in the seller&apos;s hand is that same card.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border hover:border-emerald-500/50 transition-colors">
                        <CardContent className="p-8">
                            <ShieldCheck className="h-12 w-12 text-emerald-700 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">2. Inspect on pickup</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Cash on pickup in Perth lets you check the item in person before any money changes hands. For PayID orders, only pay the PayID shown on your Benched order page, with your order reference.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border hover:border-red-500/50 transition-colors">
                        <CardContent className="p-8">
                            <ShieldAlert className="h-12 w-12 text-red-500 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">3. Report and block</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                If an item is fake or not as described, report it from your order or the <Link href="/contact?topic=order-problem" className="underline">contact page</Link>. We may remove the listing, end the account, and block the mobile number sitewide. Rights holders can also use our <Link href="/report-infringement" className="underline">infringement report form</Link>.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-3xl p-10 md:p-16">
                    <h2 className="text-3xl font-black text-foreground mb-6 flex items-center gap-3">
                        <Fingerprint className="text-primary h-8 w-8" />
                        Seller and buyer responsibility
                    </h2>
                    <p className="text-lg text-foreground/80 leading-relaxed mb-6">
                        Sellers warrant that they own the item and that the listing, including condition and authenticity, is accurate. Buyers should inspect high-resolution photos, ask questions, and use cash on pickup for significant purchases when they can.
                    </p>
                    <p className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
                        Never pay a PayID or bank account sent to you by message, email or text.
                    </p>
                </div>
            </div>
        </div>
    );
}
