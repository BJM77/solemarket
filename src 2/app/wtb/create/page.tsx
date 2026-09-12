import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WTBForm } from '@/components/wtb/WTBForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Create WTB Listing | Benched',
    description: 'Post a Wanted To Buy listing for collectibles you\'re actively seeking.',
};

export default function CreateWTBPage() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden py-16">
            {/* Background Accents */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary opacity-5 blur-[120px] -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500 opacity-5 blur-[100px] translate-y-1/2"></div>

            <div className="container mx-auto max-w-3xl px-6 relative z-10">
                <Button variant="ghost" asChild className="mb-10 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <Link href="/wtb">
                        <ArrowLeft className="mr-3 h-5 w-5" />
                        Back to requests
                    </Link>
                </Button>

                <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 md:p-12 pb-6">
                        <div className="h-1 w-20 bg-primary mb-8 rounded-full" />
                        <CardTitle className="text-4xl md:text-5xl font-black italic tracking-tighter mb-4 uppercase">
                            Create <span className="text-primary">Demand.</span>
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg font-medium leading-relaxed">
                            Define your grail. Only verified members can initiate high-value requests.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 md:p-12 pt-0">
                        <WTBForm mode="create" />
                    </CardContent>
                </Card>

                <div className="mt-10 p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-slate-400">Optimization Protocol.</h3>
                    </div>
                    <ul className="grid sm:grid-cols-2 gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-primary font-black">01</span>
                            <span>Specify year & condition</span>
                        </li>
                        <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-primary font-black">02</span>
                            <span>Upload reference frames</span>
                        </li>
                        <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-primary font-black">03</span>
                            <span>Calibrate max price</span>
                        </li>
                        <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-primary font-black">04</span>
                            <span>Define shipping sector</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
