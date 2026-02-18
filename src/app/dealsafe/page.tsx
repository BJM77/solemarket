import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCheck, Banknote, PackageCheck, Lock, Handshake, CheckCircle2, Scale, ShoppingCart } from "lucide-react";
import { DealSafeEnquiryDialog } from "./EnquiryDialog";

const buyerBenefits = [
    {
        title: "Peer-to-Peer Trust",
        description: "Review detailed photos and seller history to trade with confidence in our community."
    },
    {
        title: "Protected Funds",
        description: "Your money stays in our secure trust account. We only release it once the item is confirmed and ready to ship to you."
    },
    {
        title: "Dispute-Free Experience",
        description: "Since we inspect the item first, the risk of 'item not as described' disputes is eliminated."
    }
];

const sellerBenefits = [
    {
        title: "Guaranteed Payment",
        description: "Know that the buyer has already paid before you even ship. We confirm the funds are secured in full."
    },
    {
        title: "Zero Chargeback Risk",
        description: "By using Benched as the intermediary, you are protected from fraudulent 'not received' or 'unauthorized' claims."
    },
    {
        title: "Trust & Reputation",
        description: "Offering DealSafe on your listings shows buyers you are a serious, honest seller, helping you sell high-value items faster."
    }
];

export default function DealSafePage() {
    return (
        <div className="bg-white min-h-screen">
            <div className="container py-12 md:py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10 border-none px-4 py-1">Exclusive Service</Badge>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-slate-900">
                        Trade with Absolute <span className="text-primary">Confidence.</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        DealSafe is Benched's premier escrow and secure payment service. We eliminate the risk of online trading by acting as a trusted third-party intermediary for your funds and high-value trades.
                    </p>
                </div>

                {/* The Non-Biased Pillar */}
                <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white mb-24 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl mb-6">
                                <Scale className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold mb-6">A Truly Non-Biased Transaction</h2>
                            <p className="text-slate-300 text-lg leading-relaxed mb-6">
                                The biggest hurdle in online collecting is trust. Does the seller actually have the item? Will the buyer actually pay?
                            </p>
                            <p className="text-slate-300 text-lg leading-relaxed">
                                Benched solves this by remaining **neutral**. We don't take sides; we take responsibility. By holding the seller's stock and the buyer's money simultaneously, we create a "trust vacuum" where neither party can lose. If the deal isn't perfect, the item goes back, the money goes back, and no one is out of pocket.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="text-primary h-5 w-5" />
                                    For the Buyer
                                </h4>
                                <p className="text-sm text-slate-400">Your funds are protected. We verify the item exists and matches the description before a single cent reaches the seller.</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="text-primary h-5 w-5" />
                                    For the Seller
                                </h4>
                                <p className="text-sm text-slate-400">Your stock is safe. We confirm the buyer's payment is cleared and secured before you are asked to ship your valuable items.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mutual Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
                    <Card className="border-2 border-slate-100 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                                </div>
                                Buyer Protection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {buyerBenefits.map(b => (
                                <div key={b.title}>
                                    <h4 className="font-bold text-slate-900 mb-1">{b.title}</h4>
                                    <p className="text-sm text-muted-foreground">{b.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-slate-100 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Handshake className="h-4 w-4 text-emerald-600" />
                                </div>
                                Seller Protection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {sellerBenefits.map(s => (
                                <div key={s.title}>
                                    <h4 className="font-bold text-slate-900 mb-1">{s.title}</h4>
                                    <p className="text-sm text-muted-foreground">{s.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Call to Action */}
                <div className="text-center bg-primary/5 rounded-3xl py-16 px-8 border border-primary/10">
                    <h2 className="text-3xl font-bold mb-4 font-headline">Ready for a DealSafe trade?</h2>
                    <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
                        Whether you're buying a 1st Edition Charizard or selling a rare historical coin, protect your investment with Benched's most trusted service.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <DealSafeEnquiryDialog>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold rounded-xl border-2 transition-all hover:bg-white">
                                Contact an Expert
                            </Button>
                        </DealSafeEnquiryDialog>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </span>
    )
}