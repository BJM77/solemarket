import type { Metadata } from 'next';
import { SITE_NAME } from '@/config/brand';
import { Search, ShieldCheck, ShoppingBag, PlusSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help Centre',
  description: 'Get help buying and selling on Benched: orders, paying by PayID or cash, shipping, listings and account questions answered.',
  alternates: { canonical: '/help' },
};

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
            { name: 'How payment works', href: '/help#how-payment-works' },
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
                        <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-6">
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

            <section id="how-payment-works" className="mb-16 scroll-mt-24 p-8 border rounded-3xl bg-orange-50 border-orange-200 text-slate-800">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">How payment works</h2>
                <p className="mb-4">Benched doesn&apos;t hold your money. You pay the seller directly, in one of two ways:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong>Seller approval:</strong> Buy Now and Make an Offer send the seller a request. The item stays listed until the seller accepts; they can also decline, or answer an offer with one counter-offer. Unanswered requests expire after 24 hours. You can have up to 3 items requested or reserved at once. You don&apos;t need an account to buy.</li>
                    <li><strong>PayID (bank transfer):</strong> once the seller accepts, the item is reserved for you and your Benched order page shows the seller&apos;s PayID, the amount and your order reference. Please pay soon: if payment or pickup takes too long, the seller can relist it.</li>
                    <li><strong>Cash on pickup (Perth only):</strong> arrange a safe, public meeting place with the seller, inspect the item, then pay cash.</li>
                </ul>
                <p className="font-semibold">Only pay the PayID shown on your Benched order page. Never pay a PayID or bank account sent to you by message, email or text. Something not right? <Link href="/contact?topic=order-problem" className="underline">Report a problem</Link>.</p>
            </section>

            <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-8 md:p-16 text-center">
                <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter italic">Still need assistance?</h2>
                <p className="text-xl text-primary-foreground mb-10 max-w-2xl mx-auto">
                    Our team of hoop culture specialists is ready to get you back in the game.
                </p>
                <Link 
                    href="/contact" 
                    className="inline-flex h-14 px-10 items-center justify-center bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                    Contact Support
                </Link>
            </div>
        </div>
    );
}
