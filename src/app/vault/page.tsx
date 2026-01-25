'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, PackageCheck, Lock, CheckCircle2, DollarSign, Search, Truck, ArrowRight, UserCheck, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function VaultPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
           <Image 
              src="https://images.unsplash.com/photo-1621360841012-3f82413a967e?q=80&w=2070&auto=format&fit=crop"
              alt="Secure vault background"
              fill
              className="object-cover"
              priority
           />
           <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/60" />
        </div>

        <div className="container relative z-10 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Official Middle-Man Service</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
            >
              The Safest Way to Trade <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Collectibles in Australia.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed"
            >
              We act as the unbiased middle-man. We hold the money, verify the product, and ensure both buyer and seller are 100% protected. No scams. No chargebacks. Just peace of mind.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/20">
                Start a Vault Transaction
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold text-white border-slate-600 hover:bg-white/10 rounded-full">
                How It Works
              </Button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 w-full max-w-md"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div className="text-slate-300 font-medium">Service Fee</div>
                <div className="text-3xl font-bold text-white">$49.95 <span className="text-sm font-normal text-slate-400">/ transaction</span></div>
              </div>
              <div className="space-y-4">
                <FeatureRow text="Physical Item Authentication" />
                <FeatureRow text="Secure Payment Escrow" />
                <FeatureRow text="Insured Shipping" />
                <FeatureRow text="Dispute Resolution" />
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                 <p className="text-sm text-slate-400">Available for items valued $250 - $50,000</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Stats */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem label="Australian Owned" value="100%" />
            <StatItem label="Secure Transactions" value="10k+" />
            <StatItem label="Verified Sellers" value="500+" />
            <StatItem label="Money Back" value="Guarantee" />
        </div>
      </div>

      {/* How It Works - The Core Value */}
      <section className="py-20 container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">The "No-Stress" Transaction</h2>
          <p className="text-lg text-slate-600">
            We've removed the trust barrier. You don't need to trust the stranger on the internet—you just need to trust Picksy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-slate-200 -z-10" />

          <ProcessStep 
            number="1" 
            title="Agreement" 
            desc="Buyer and Seller agree on a price. Buyer pays Picksy (not the seller)."
            icon={<CreditCard className="h-6 w-6 text-emerald-600" />}
          />
          <ProcessStep 
            number="2" 
            title="Ship to Vault" 
            desc="Seller ships the item to our secure Australian facility for verification."
            icon={<Truck className="h-6 w-6 text-emerald-600" />}
          />
          <ProcessStep 
            number="3" 
            title="Verification" 
            desc="Our experts inspect the item to ensure it matches the listing perfectly."
            icon={<Search className="h-6 w-6 text-emerald-600" />}
          />
          <ProcessStep 
            number="4" 
            title="Payout" 
            desc="We ship the item to the buyer and release funds to the seller instantly."
            icon={<DollarSign className="h-6 w-6 text-emerald-600" />}
          />
        </div>
      </section>

      {/* Buyer vs Seller Benefits */}
      <section className="py-20 bg-slate-100">
        <div className="container max-w-5xl">
          <Tabs defaultValue="sellers" className="w-full">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold mb-8">Why use the Vault?</h2>
               <TabsList className="bg-white p-1 rounded-full border shadow-sm">
                  <TabsTrigger value="sellers" className="rounded-full px-8 py-3 text-base data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all">For Sellers</TabsTrigger>
                  <TabsTrigger value="buyers" className="rounded-full px-8 py-3 text-base data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">For Buyers</TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="sellers" className="mt-0">
               <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="order-2 md:order-1 space-y-6">
                    <BenefitItem title="Zero Chargeback Risk" desc="Since we verify the item before shipping to the buyer, they cannot claim 'item not as described' later." />
                    <BenefitItem title="Guaranteed Payment" desc="We secure the funds BEFORE you ship. You never ship an item without knowing the money is there." />
                    <BenefitItem title="Premium Badge" desc="Listings with Vault enabled sell 3x faster because buyers feel safe." />
                    <div className="pt-4">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8">Start Selling Securely</Button>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
                     <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070&auto=format&fit=crop" alt="Seller happy" fill className="object-cover" />
                     <div className="absolute inset-0 bg-emerald-900/10" />
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="buyers" className="mt-0">
               <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="order-2 md:order-1 space-y-6">
                    <BenefitItem title="100% Authenticity Guarantee" desc="If the item is fake or not as described, we return your money instantly. Full stop." />
                    <BenefitItem title="Professional Inspection" desc="We check corners, edges, and surface conditions for cards, and authenticity for coins/memorabilia." />
                    <BenefitItem title="Secure Shipping" desc="We repackage the item in professional-grade protection for the final leg of the journey." />
                    <div className="pt-4">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8">Browse Vault Items</Button>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
                     <Image src="https://images.unsplash.com/photo-1561414927-6d86591d0c4f?q=80&w=1973&auto=format&fit=crop" alt="Buyer happy" fill className="object-cover" />
                     <div className="absolute inset-0 bg-blue-900/10" />
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 container max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full space-y-4">
          <FAQItem 
            question="What is the cost?" 
            answer="We charge a flat fee of $49.95 AUD per transaction, regardless of the item's value. This covers the authentication, escrow service, and secure handling." 
          />
          <FAQItem 
            question="Who pays for shipping?" 
            answer="The seller pays to ship the item to our Vault facility. Picksy covers the insured shipping from the Vault to the Buyer." 
          />
          <FAQItem 
            question="What happens if an item fails verification?" 
            answer="If an item is deemed inauthentic or significantly not as described, we cancel the transaction. The buyer gets a full refund, and the item is returned to the seller (seller pays return shipping)." 
          />
          <FAQItem 
            question="How long does the process take?" 
            answer="Once we receive the item, verification typically takes 24-48 hours. Payouts are released immediately after verification." 
          />
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-slate-900 text-white text-center">
        <div className="container max-w-4xl">
           <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to trade with confidence?</h2>
           <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Join thousands of Australians who trust Picksy Vault for their high-value collectibles.</p>
           <Button size="lg" className="h-16 px-12 text-xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 border-0 rounded-full shadow-2xl shadow-emerald-500/20">
             Get Started Now
           </Button>
        </div>
      </section>
    </div>
  );
}

// Sub-components for cleaner code
function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-200">
      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
    return (
        <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-slate-900 mb-1">{value}</div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</div>
        </div>
    )
}

function ProcessStep({ number, title, desc, icon }: { number: string, title: string, desc: string, icon: React.ReactNode }) {
    return (
        <div className="relative bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center text-center z-10 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                {icon}
            </div>
            <div className="absolute top-4 right-4 text-4xl font-black text-slate-100 -z-10">{number}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
    )
}

function BenefitItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 bg-emerald-100 p-1.5 rounded-full h-fit w-fit">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
                <h4 className="font-bold text-lg text-slate-900">{title}</h4>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <AccordionItem value={question} className="bg-white border border-slate-200 rounded-lg px-6 shadow-sm">
            <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:text-emerald-600 text-left">{question}</AccordionTrigger>
            <AccordionContent className="text-slate-600 pb-6 leading-relaxed">
                {answer}
            </AccordionContent>
        </AccordionItem>
    )
}