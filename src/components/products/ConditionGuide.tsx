
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Info, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ConditionGuide({ trigger }: { trigger?: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <button className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">
                        <Info className="h-3 w-3" />
                        Condition Guide
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase italic italic">Condition Standards</DialogTitle>
                    <DialogDescription>
                        Benched uses industry-standard grading to ensure trust between buyers and sellers.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="cards" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cards">Collector Cards</TabsTrigger>
                        <TabsTrigger value="sneakers">Sneakers</TabsTrigger>
                    </TabsList>

                    <TabsContent value="cards" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <ConditionItem 
                                label="Mint / Gem Mint" 
                                description="A perfect card with no visible flaws. Sharp corners, perfect centering, and original gloss." 
                                icon={<Sparkles className="h-4 w-4 text-yellow-500" />}
                            />
                            <ConditionItem 
                                label="Near Mint (NM)" 
                                description="Looks nearly perfect at first glance. May have very minor surface wear or a tiny speck on a corner." 
                                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            />
                            <ConditionItem 
                                label="Excellent" 
                                description="Minor visible wear. May have slight whitening on edges or very light surface scratches." 
                                icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
                            />
                            <ConditionItem 
                                label="Good / Fair" 
                                description="Visible wear, including soft corners, creases, or significant surface scuffing. Still a great collection piece." 
                                icon={<Info className="h-4 w-4 text-slate-400" />}
                            />
                        </div>
                        <div className="bg-muted p-4 rounded-xl text-xs space-y-2">
                            <p className="font-bold uppercase tracking-wider text-primary">Pro Tip for Cards:</p>
                            <p>Always photograph the 4 corners and the back of the card. Buyers look for "edge whitening" and "centering" when deciding on high-value cards.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="sneakers" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <ConditionItem 
                                label="New / Deadstock (DS)" 
                                description="Brand new, never worn, never even tried on. Includes original box and all accessories (extra laces, etc)." 
                                icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
                            />
                            <ConditionItem 
                                label="VNDS (Very Near Deadstock)" 
                                description="Worn once or twice indoors. No visible star loss on soles, no creases, looks brand new." 
                                icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
                            />
                            <ConditionItem 
                                label="Used / Good" 
                                description="Worn regularly but well maintained. Minor creasing or slight sole wear. No major smells or damage." 
                                icon={<Info className="h-4 w-4 text-slate-400" />}
                            />
                            <ConditionItem 
                                label="Beaters" 
                                description="Heavily worn. Significant sole wear, deep creases, or marks. Priced for utility rather than collection." 
                                icon={<Trash2 className="h-4 w-4 text-rose-400" />}
                            />
                        </div>
                        <div className="bg-muted p-4 rounded-xl text-xs space-y-2">
                            <p className="font-bold uppercase tracking-wider text-primary">Pro Tip for Sneakers:</p>
                            <p>Be honest about "Star Loss" on the soles and any "Heel Drag." Clear photos of the size tag and inner soles help verify authenticity.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function ConditionItem({ label, description, icon }: { label: string, description: string, icon: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
            <div className="mt-1">{icon}</div>
            <div>
                <h4 className="font-bold text-sm uppercase tracking-tight">{label}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

const Trash2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
