import React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Hash, Calendar, CheckCircle2 } from 'lucide-react';
import type { Metadata, ResolvingMetadata } from 'next';
import { brandConfig } from '@/config/brand';

interface Props {
    params: { certId: string };
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    return {
        title: `Vault Passport ${params.certId} | ${brandConfig.seo.defaultTitle}`,
        description: `Cryptographic proof of authenticity for Benched Vault item ${params.certId}.`,
    };
}

// Mock fetcher to simulate fetching the Passport record from DB
async function getPassportRecord(certId: string) {
    if (certId === 'BCH-TEST-123') {
        return {
            certId,
            itemId: 'item-8f92',
            itemTitle: 'Jordan 1 Retro High Chicago',
            verifiedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
            authenticatorId: 'auth_admin_01',
            photoHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            grade: 'Brand New',
            jwtSignature: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...', // Mock JWT
            publicKeyFingerprint: 'ed25519:3b9c2a...'
        };
    }
    return null;
}

export default async function PassportPage({ params }: Props) {
    const record = await getPassportRecord(params.certId);

    if (!record) {
        notFound();
    }

    return (
        <div className="bg-black min-h-screen pt-24 pb-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12 border-b border-white/10 pb-8">
                    <ShieldCheck className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                        Vault Passport
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full font-mono text-lg mb-4 border border-emerald-500/20">
                        {record.certId}
                    </div>
                    <p className="text-muted-foreground">
                        This item has been physically inspected and mathematically verified.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Item Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Title</div>
                                <div className="font-bold text-lg">{record.itemTitle}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Condition</div>
                                <Badge variant="outline">{record.grade}</Badge>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Date Verified</div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {new Date(record.verifiedAt).toLocaleDateString('en-AU', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-emerald-500/30">
                        <CardHeader>
                            <CardTitle className="text-sm text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Cryptographic Proof
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-emerald-500/70 mb-1">Digital Signature (JWT)</div>
                                <div className="font-mono text-xs text-muted-foreground bg-black/50 p-2 rounded truncate border border-white/5">
                                    {record.jwtSignature}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-emerald-500/70 mb-1">Photo Provenance Hash (SHA-256)</div>
                                <div className="font-mono text-xs text-muted-foreground bg-black/50 p-2 rounded truncate border border-white/5 flex items-center gap-2">
                                    <Hash className="h-3 w-3" />
                                    {record.photoHash}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-emerald-500/20">
                                <p className="text-xs text-emerald-500/80 leading-relaxed">
                                    This passport is signed with Benched's private Ed25519 key. 
                                    It cannot be forged, altered, or duplicated. 
                                    The photo hash proves the exact physical condition of the item at the moment of verification.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
