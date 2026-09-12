import { ShieldCheck, CheckCircle, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TrustBar() {
    return (
        <section className="bg-black py-16 border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="text-center mb-10">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">The Benched Standard</span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mt-1">
                        Built for Serious Australian Collectors
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col items-center text-center p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-primary/40 transition-all group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-white mb-1.5 text-base">DealSafe™ Escrow</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Your payment is safely held in escrow until you receive and verify the item. 100% money-back guarantee.
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-primary/40 transition-all group">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-white mb-1.5 text-base">Verified Sellers</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Every high-value seller undergoes identity verification, rating checks, and transaction history review.
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-primary/40 transition-all group">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-white mb-1.5 text-base">AI Fast Valuation</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Instant AI card, shoe, and coin scanning with live Australian market sales comps and zero hidden seller listing fees.
                        </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-primary/40 transition-all group">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-white mb-1.5 text-base">Local AU Shipping</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Direct peer-to-peer Australian express shipping with tracking numbers and signature on delivery options.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

