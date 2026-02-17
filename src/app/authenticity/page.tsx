import { ShieldCheck, Search, Zap, CheckCircle2, Microscope, FileCheck2, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Authenticity Guaranteed | Benched',
    description: 'How Benched ensures every performance sneaker is 100% authentic. Learn about our verification process.',
};

const STEPS = [
    {
        title: 'Initial Scrutiny',
        description: 'Our specialists review every listing before it goes live. We check for common red flags in photos, box labels, and seller history.',
        icon: Search,
        color: 'bg-blue-500'
    },
    {
        title: 'Physical Inspection',
        description: 'Once sold, the item is checked for structural integrity. Basketball shoes must perform. We check cushioning, glue points, and material quality.',
        icon: Microscope,
        color: 'bg-orange-500'
    },
    {
        title: 'Tech Verification',
        description: 'We verify the tech specs. Does the Zoom Air feel correct? Is the Flyknit authentic? We know the engineering of hoop shoes.',
        icon: Zap,
        color: 'bg-yellow-500'
    },
    {
        title: 'Final Approval',
        description: 'Only after passing all checks do we issue the "Benched Verified" tag. The second half starts only when we are 100% sure.',
        icon: FileCheck2,
        color: 'bg-emerald-500'
    }
];

export default function AuthenticityPage() {
    return (
        <div className="bg-background min-h-screen">
            {/* Hero Section */}
            <section className="relative py-24 overflow-hidden border-b border-border/10">
                <div className="absolute inset-0 bg-primary/5 -z-10" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-secondary/5 to-transparent -z-10" />
                
                <div className="max-w-[1440px] mx-auto px-4 md:px-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
                            <ShieldCheck className="h-4 w-4 text-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Zero Fake Policy</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-foreground mb-8 leading-[0.9]">
                            Trust is the <br />
                            <span className="text-secondary">#1 Currency.</span>
                        </h1>
                        <p className="text-xl md:text-2xl font-medium text-muted-foreground leading-relaxed mb-10">
                            In the basketball world, performance matters. You can't play your second half in a fake. 
                            We ensure every pair that hits the court is 100% verified.
                        </p>
                    </div>
                </div>
            </section>

            {/* The Process */}
            <section className="py-24 max-w-[1440px] mx-auto px-4 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {STEPS.map((step, i) => (
                        <div key={step.title} className="relative">
                            <div className="text-8xl font-black text-muted/20 absolute -top-12 -left-4 pointer-events-none">
                                0{i + 1}
                            </div>
                            <div className={cn("size-16 rounded-2xl flex items-center justify-center text-white mb-6 relative z-10 shadow-lg", step.color)}>
                                <step.icon className="size-8" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{step.title}</h3>
                            <p className="text-muted-foreground font-medium leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Deep Dive Section */}
            <section className="py-24 bg-primary text-white">
                <div className="max-w-[1440px] mx-auto px-4 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter uppercase">Beyond the Box</h2>
                        <div className="space-y-8">
                            <div className="flex gap-6">
                                <div className="bg-secondary p-3 rounded-xl h-fit">
                                    <Fingerprint className="size-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black uppercase mb-2">Material Science</h4>
                                    <p className="text-white/60 font-medium">We use macro-photography to verify the thread count in knits and the density of the foams. Fakes can't replicate the engineering.</p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="bg-secondary p-3 rounded-xl h-fit">
                                    <CheckCircle2 className="size-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black uppercase mb-2">Scent Verification</h4>
                                    <p className="text-white/60 font-medium">The distinct industrial adhesives used by major manufacturers have a unique profile. Our team is trained to detect it.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <img 
                            src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=1000" 
                            className="rounded-[2rem] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500"
                            alt="Verification detail"
                        />
                        <div className="absolute -bottom-10 -left-10 glass-card p-6 rounded-2xl border-white/20 border text-black bg-white/90">
                            <p className="text-4xl font-black text-secondary">0%</p>
                            <p className="text-xs font-black uppercase tracking-widest">Fake Acceptance Rate</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 text-center">
                <h2 className="text-3xl md:text-5xl font-black mb-8 tracking-tight">Ready to get back in the game?</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" className="h-14 px-10 rounded-2xl font-black bg-primary text-white" asChild>
                        <Link href="/browse">Shop Verified</Link>
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 px-10 rounded-2xl font-black" asChild>
                        <Link href="/sell">Put Yours on the Bench</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
