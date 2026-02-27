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
        <div className="bg-black min-h-screen text-white">
            <div className="container py-12 md:py-20">
                <div className="max-w-4xl mx-auto text-center mb-16 px-4">
                    <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-6 py-1.5 text-sm uppercase tracking-widest font-bold">Exclusive Service</Badge>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-white">
                        Trade with Absolute <span className="text-primary italic">Confidence.</span>
                    </h1>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        DealSafe is Benched's premier escrow and secure payment service. We eliminate the risk of online trading by acting as a trusted third-party intermediary for your funds and high-value trades.
                    </p>
                </div>

                {/* The Non-Biased Pillar */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 md:p-16 text-white mb-24 overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-20 blur-[120px] -mr-48 -mt-48 transition-all animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-10 blur-[100px] -ml-32 -mb-32"></div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center justify-center p-4 bg-primary rounded-3xl mb-8 shadow-lg shadow-primary/20">
                                <Scale className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-4xl font-black mb-8 leading-tight">A Truly Non-Biased <br />Transaction</h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-6">
                                The biggest hurdle in online collecting is trust. Does the seller actually have the item? Will the buyer actually pay?
                            </p>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                Benched solves this by remaining <strong className="text-white">neutral</strong>. We don't take sides; we take responsibility. By holding the seller's stock and the buyer's money simultaneously, we create a "trust vacuum" where neither party can lose. If the deal isn't perfect, the item goes back, the money goes back, and no one is out of pocket.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl transition-all hover:bg-white/10 group">
                                <h4 className="text-xl font-bold mb-3 flex items-center gap-3 text-white">
                                    <CheckCircle2 className="text-primary h-6 w-6 transition-transform group-hover:scale-110" />
                                    For the Buyer
                                </h4>
                                <p className="text-slate-400 leading-relaxed">Your funds are protected. We verify the item exists and matches the description before a single cent reaches the seller.</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl transition-all hover:bg-white/10 group">
                                <h4 className="text-xl font-bold mb-3 flex items-center gap-3 text-white">
                                    <CheckCircle2 className="text-primary h-6 w-6 transition-transform group-hover:scale-110" />
                                    For the Seller
                                </h4>
                                <p className="text-slate-400 leading-relaxed">Your stock is safe. We confirm the buyer's payment is cleared and secured before you are asked to ship your valuable items.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mutual Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-24">
                    <Card className="bg-slate-900/30 border-white/5 backdrop-blur-sm overflow-hidden group hover:border-blue-500/30 transition-all duration-500 rounded-[2rem]">
                        <CardHeader className="bg-blue-500/5 border-b border-white/5 px-8 py-10">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black italic">
                                <div className="h-12 w-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                    <ShoppingCart className="h-6 w-6 text-blue-400" />
                                </div>
                                Buyer Protection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {buyerBenefits.map(b => (
                                <div key={b.title} className="group/item">
                                    <h4 className="font-bold text-white text-lg mb-2 group-hover/item:text-blue-400 transition-colors">{b.title}</h4>
                                    <p className="text-slate-400 leading-relaxed">{b.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/30 border-white/5 backdrop-blur-sm overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 rounded-[2rem]">
                        <CardHeader className="bg-emerald-500/5 border-b border-white/5 px-8 py-10">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black italic">
                                <div className="h-12 w-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                    <Handshake className="h-6 w-6 text-emerald-400" />
                                </div>
                                Seller Protection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {sellerBenefits.map(s => (
                                <div key={s.title} className="group/item">
                                    <h4 className="font-bold text-white text-lg mb-2 group-hover/item:text-emerald-400 transition-colors">{s.title}</h4>
                                    <p className="text-slate-400 leading-relaxed">{s.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Call to Action */}
                <div className="text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-[3rem] py-20 px-8 border border-white/5 relative overflow-hidden">
                    <div className="max-w-xl mx-auto relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 italic tracking-tight">Ready for a <br />DealSafe trade?</h2>
                        <p className="text-slate-400 mb-10 text-xl leading-relaxed">
                            Whether you're buying a 1986 Fleer Michael Jordan or selling a rare pair of Kobes, protect your investment with Benched's most trusted service.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <DealSafeEnquiryDialog>
                                <Button size="lg" className="h-16 px-12 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                    Talk to an Expert
                                </Button>
                            </DealSafeEnquiryDialog>
                        </div>
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