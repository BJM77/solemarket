'use client';

import SellerApplicationForm from '@/components/sell/SellerApplicationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SellerApplicationPage() {
    return (
        <div className="container max-w-4xl py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid gap-8 lg:grid-cols-2"
            >
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Become a Seller</h1>
                        <p className="text-muted-foreground mt-2">
                            Unlock the ability to list your items on our marketplace. Whether you're a collector or a business, we have the tools you need.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Grow Your Business</h3>
                                <p className="text-sm text-muted-foreground">Access thousands of potential buyers instantly.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Secure Transactions</h3>
                                <p className="text-sm text-muted-foreground">Our platform ensures safety for both buyers and sellers.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Business Tools</h3>
                                <p className="text-sm text-muted-foreground">Automated inventory management for high-volume sellers.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Seller Application</CardTitle>
                        <CardDescription>
                            Please tell us a bit about your selling goals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SellerApplicationForm />
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
