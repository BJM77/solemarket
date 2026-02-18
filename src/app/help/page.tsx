import { SITE_NAME } from '@/config/brand';
import { Search, ShieldCheck, ShoppingBag, PlusSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const TOPICS = [
    {
        title: 'Buying on Benched',
        icon: ShoppingBag,
        links: [
            { name: 'How to make a purchase', href: '#' },
            { name: 'Shipping and delivery times', href: '#' },
            { name: 'Payment methods accepted', href: '#' },
        ]
    },
    {
        title: 'Selling on Benched',
        icon: PlusSquare,
        links: [
            { name: 'Creating your first listing', href: '#' },
            { name: 'Seller fees and payouts', href: '#' },
            { name: 'Shipping your sold items', href: '#' },
        ]
    },
    {
        title: 'Trust & Safety',
        icon: ShieldCheck,
        links: [
            { name: 'Our Authenticity Guarantee', href: '/authenticity' },
            { name: 'How DealSafe works', href: '/dealsafe' },
            { name: 'What to do if there is an issue', href: '#' },
        ]
    }
];

export default function HelpPage() {
    return (
        <div className="container max-w-6xl mx-auto px-4 py-12">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter italic">How can we help?</h1>
                <div className="max-w-2xl mx-auto relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search for articles..." 
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-border focus:border-primary outline-none transition-all font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {TOPICS.map((topic) => (
                    <div key={topic.title} className="p-8 border rounded-3xl bg-muted/30">
                        <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white mb-6">
                            <topic.icon className="size-6" />
                        </div>
                        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">{topic.title}</h2>
                        <ul className="space-y-4">
                            {topic.links.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary font-medium flex items-center group">
                                        {link.name}
                                        <ArrowRight className="size-4 ml-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="bg-primary text-white rounded-[2.5rem] p-8 md:p-16 text-center">
                <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter italic">Still need assistance?</h2>
                <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
                    Our team of hoop culture specialists is ready to get you back in the game.
                </p>
                <Link 
                    href="/contact" 
                    className="inline-flex h-14 px-10 items-center justify-center bg-secondary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                    Contact Support
                </Link>
            </div>
        </div>
    );
}
