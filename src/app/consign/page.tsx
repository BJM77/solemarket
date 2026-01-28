'use client';
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Shield, TrendingUp, Clock, Eye, Handshake, Mail, Phone, Star, Boxes, Gem, Bitcoin, BookOpen } from "lucide-react";
import Image from 'next/image';
import { ConsignmentForm } from "./contact-form";


export default function ConsignPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white">
                <div className="container mx-auto px-4 py-20 md:py-28">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
                            Turn Your Collectibles into Cash, Effortlessly
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 text-blue-100 font-light">
                            Maximize Your Returns, Minimize Your Effort.
                        </p>
                        <p className="text-lg text-blue-100 mb-10">
                            Our premier consignment service handles everything, so you can sell your collection discreetly and profitably.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-lg py-7 px-8"
                                onClick={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Get a Free Valuation
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="bg-transparent border-white text-white hover:bg-white/10 hover:text-white font-bold text-lg py-7 px-8"
                                onClick={() => document.getElementById('process-section')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                How It Works
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16">

                {/* What We Accept Section */}
                <div className="max-w-5xl mx-auto mb-20 text-center">
                    <h2 className="text-4xl font-bold mb-4">What We Accept</h2>
                    <p className="text-lg text-gray-600 mb-12">We specialize in a wide range of high-value collectibles. If you have quality items, we can sell them.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-xl">
                            <Gem className="h-10 w-10 text-blue-600 mb-3" />
                            <span className="font-semibold text-center">Sports & Trading Cards</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-xl">
                            <Bitcoin className="h-10 w-10 text-orange-500 mb-3" />
                            <span className="font-semibold text-center">Coins & Banknotes</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-xl">
                            <BookOpen className="h-10 w-10 text-green-600 mb-3" />
                            <span className="font-semibold text-center">Comic Books</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-xl">
                            <Boxes className="h-10 w-10 text-purple-600 mb-3" />
                            <span className="font-semibold text-center">Sealed Products</span>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-gray-100 rounded-xl">
                            <Star className="h-10 w-10 text-yellow-500 mb-3" />
                            <span className="font-semibold text-center">Other Graded Items</span>
                        </div>
                    </div>
                </div>

                {/* Why Consign Section */}
                <div className="max-w-5xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold text-center mb-12">
                        The Picksy Advantage
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="border-2 hover:border-blue-500 transition-all shadow-sm hover:shadow-lg">
                            <CardContent className="p-8">
                                <div className="flex items-start gap-5">
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <Eye className="h-7 w-7 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-2">Sell Discreetly & Confidentially</h3>
                                        <p className="text-gray-600 text-lg">
                                            Your identity remains 100% private. We manage all listings and buyer communications, ensuring you stay anonymous.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-green-500 transition-all shadow-sm hover:shadow-lg">
                            <CardContent className="p-8">
                                <div className="flex items-start gap-5">
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <TrendingUp className="h-7 w-7 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-2">Expert Pricing & Maximum Returns</h3>
                                        <p className="text-gray-600 text-lg">
                                            Leverage our market expertise. We use cutting-edge pricing strategies to ensure your items fetch the highest possible market price.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-purple-500 transition-all shadow-sm hover:shadow-lg">
                            <CardContent className="p-8">
                                <div className="flex items-start gap-5">
                                    <div className="p-3 bg-purple-100 rounded-full">
                                        <Clock className="h-7 w-7 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-2">We Do All The Work</h3>
                                        <p className="text-gray-600 text-lg">
                                            From professional, high-resolution photography to listings, customer service, and shipping – we handle it all. You just relax and get paid.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-orange-500 transition-all shadow-sm hover:shadow-lg">
                            <CardContent className="p-8">
                                <div className="flex items-start gap-5">
                                    <div className="p-3 bg-orange-100 rounded-full">
                                        <Shield className="h-7 w-7 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-2">Peace of Mind with Full Insurance</h3>
                                        <p className="text-gray-600 text-lg">
                                            Your valuable items are fully insured and protected from the moment they are in our care until they are safely in the buyer's hands.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* How It Works */}
                <div id="process-section" className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold text-center mb-12">
                        Your Simple Path to Getting Paid
                    </h2>

                    <div className="relative">
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true"></div>
                        <div className="space-y-12">
                            <div className="flex items-start gap-8">
                                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-2xl z-10">1</div>
                                <div className="flex-1 pt-2">
                                    <h3 className="text-2xl font-semibold mb-2">Initial Consultation</h3>
                                    <p className="text-gray-600 text-lg">Submit an enquiry to discuss your collection. We'll provide a free, no-obligation assessment and valuation estimate.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-8">
                                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-2xl z-10">2</div>
                                <div className="flex-1 pt-2">
                                    <h3 className="text-2xl font-semibold mb-2">Agree on Your Rate</h3>
                                    <p className="text-gray-600 text-lg">We offer fair, transparent, and flexible commission rates tailored to the value of your items and our partnership.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-8">
                                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-2xl z-10">3</div>
                                <div className="flex-1 pt-2">
                                    <h3 className="text-2xl font-semibold mb-2">We Take Over</h3>
                                    <p className="text-gray-600 text-lg">Sit back as we manage every detail: professional photography, compelling listings, buyer inquiries, and secure shipping.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-8">
                                <div className="flex-shrink-0 w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-2xl z-10">4</div>
                                <div className="flex-1 pt-2">
                                    <h3 className="text-2xl font-semibold mb-2">Receive Your Payout</h3>
                                    <p className="text-gray-600 text-lg">Once your item sells, you receive your payout quickly and securely. Simple, transparent, and profitable.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonials Section */}
                <div className="bg-gray-100/70 py-16 mb-20 rounded-xl">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl font-bold mb-12">Trusted by Collectors Like You</h2>
                        <div className="grid md:grid-cols-2 gap-8 px-6">
                            <Card className="bg-white">
                                <CardContent className="p-6">
                                    <div className="flex mb-2">
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                    </div>
                                    <p className="text-gray-700 italic mb-4">"The entire process was seamless. I sent my cards in, and Picksy handled the rest. The final sale price exceeded my expectations. Highly recommend for anyone who values their time and privacy."</p>
                                    <p className="font-semibold">- David R., Private Collector</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white">
                                <CardContent className="p-6">
                                    <div className="flex mb-2">
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                        <Star className="text-yellow-400" />
                                    </div>
                                    <p className="text-gray-700 italic mb-4">"I was nervous about selling my late father's coin collection, but they handled it with the utmost professionalism and respect. The communication was excellent, and the results were fantastic."</p>
                                    <p className="font-semibold">- Sarah L., Estate Seller</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-lg font-medium text-left">How does the valuation process work?</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                We start with a free preliminary assessment based on photos and details you provide. If you decide to proceed, you send the items to us for a physical inspection and a final valuation before we list them.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-lg font-medium text-left">What are your fees?</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                Our commission rates are competitive and tiered based on the value of your items. We agree on a transparent rate upfront during the consultation, so there are no surprises or hidden costs.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger className="text-lg font-medium text-left">Is my collection insured?</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                Yes, absolutely. From the moment your items arrive at our secure facility until they reach the buyer, they are fully insured against theft, damage, and loss.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger className="text-lg font-medium text-left">How long does it take to get paid?</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                Payouts are processed promptly after the sale is finalized and the buyer has received the item, typically within 5-7 business days.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-5">
                            <AccordionTrigger className="text-lg font-medium text-left">Do you sell internationally?</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                Yes! We list your items on global marketplaces to ensure they reach the widest audience of serious collectors, maximizing your final sale price.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/* CTA Section */}
                <div id="enquiry-form" className="relative max-w-6xl mx-auto bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-8 md:p-12 overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full"></div>
                    <div className="absolute -bottom-12 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="text-left">
                            <h2 className="text-4xl md:text-5xl font-bold mb-4">
                                Ready to Unlock the Value of Your Collection?
                            </h2>
                            <p className="text-xl mb-8 text-blue-100">
                                Submit the enquiry form below for a free, no-obligation consultation. Our team will review your collection and get back to you within 24-48 hours.
                            </p>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 max-w-md">
                                <h3 className="text-2xl font-semibold mb-4">Expert Guidance</h3>
                                <p className="text-blue-100 italic">
                                    "We treat every collection with the respect it deserves, ensuring you get maximum market value with zero hassle."
                                </p>
                            </div>
                        </div>

                        <div>
                            <ConsignmentForm />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
