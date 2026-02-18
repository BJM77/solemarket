import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Camera, Trophy, Footprints, Library, ArrowRight } from "lucide-react";
import Image from "next/image";

export const metadata = {
    title: 'Donate | The Second Half Mission | Benched',
    description: 'Donate your basketball shoes or cards to less privileged athletes. See your gear back in action.',
};

export default function DonatePage() {
    return (
        <div className="bg-white min-h-screen">
            {/* Hero Mission Section */}
            <div className="relative bg-slate-900 py-20 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <img 
                        src="https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?auto=format&fit=crop&q=80&w=2000" 
                        alt="Basketball Court" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary mb-8 animate-bounce">
                        <Heart className="h-4 w-4 fill-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">The Second Half Mission</span>
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight uppercase leading-[0.9]">
                        Greatness has <br />
                        <span className="text-primary italic">No Zip Code.</span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
                        We love basketball. But not everyone has the gear to play it. 
                        Donate your kicks or cards to help less privileged hoopers chase their goals.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 relative z-20 mb-24">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* How it Works Cards */}
                    <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-primary text-white p-8">
                            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                                <Footprints className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase">1. Donate Gear</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <p className="text-muted-foreground leading-relaxed">
                                Send us your performance basketball shoes or collectible cards. We accept new and gently used items that still have "minutes" left in them.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-800 text-white p-8">
                            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                                <Trophy className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase">2. We Distribute</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <p className="text-muted-foreground leading-relaxed">
                                We partner with local community clubs and youth programs to get your donations into the hands of athletes who need them most.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-primary text-white p-8">
                            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                                <Camera className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase">3. See the Impact</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>The Benched Promise:</strong> You will receive a photo of the athlete wearing your shoes or holding your cards. Connection matters.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Donation Selection */}
                <div className="mt-24 max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase mb-4">Ready to help?</h2>
                        <p className="text-muted-foreground font-medium text-lg">Select what you would like to donate today.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center transition-all hover:border-primary hover:bg-white hover:shadow-xl">
                            <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                <Footprints className="h-10 w-10 text-primary" />
                            </div>
                            <h3 className="text-2xl font-black uppercase mb-4">Basketball Shoes</h3>
                            <p className="text-muted-foreground mb-8">Performance kicks, retros, or trainers. Sizes US 5 to US 16 needed most.</p>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg">Donate Kicks</Button>
                        </div>

                        <div className="group relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center transition-all hover:border-indigo-500 hover:bg-white hover:shadow-xl">
                            <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                <Library className="h-10 w-10 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-black uppercase mb-4">Trading Cards</h3>
                            <p className="text-muted-foreground mb-8">NBA and basketball cards. Helping kids start their collection and love for the hobby.</p>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-700 border-none">Donate Cards</Button>
                        </div>
                    </div>
                </div>

                {/* Impact Story Quote */}
                <div className="mt-32 bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="grid grid-cols-6 h-full">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="border-r border-white/20 h-full"></div>
                            ))}
                        </div>
                    </div>
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <span className="text-primary text-6xl font-serif">"</span>
                        <blockquote className="text-2xl md:text-3xl font-medium leading-relaxed italic mb-8">
                            Basketball changed my life. Giving someone else the tool to play the game I love is the best part of being a collector.
                        </blockquote>
                        <p className="font-black uppercase tracking-widest text-primary">— Benched Community Member</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
