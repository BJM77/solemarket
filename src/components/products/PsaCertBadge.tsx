'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { verifyPsaCertAction, type PsaCertDetails } from '@/app/actions/marketplace/psa-cert';

export function PsaCertBadge({ certNumber }: { certNumber: string }) {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<PsaCertDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const cleanCert = String(certNumber || '').replace(/\D/g, '').trim();

    if (!cleanCert) return null;

    const handleCheck = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await verifyPsaCertAction(cleanCert);
            if (res.success) {
                setDetails(res.data);
            } else {
                setError(res.error);
            }
        } catch (e: any) {
            setError(e?.message || 'Could not check cert.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5" data-testid="psa-cert-verifier">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {details?.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cert verified with PSA
                    </span>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCheck}
                        disabled={loading}
                        className="h-7 text-[11px] font-bold border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    >
                        {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                        Check PSA Cert & Pop
                    </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-amber-900 dark:text-amber-200 px-2" asChild>
                    <a
                        href={`https://www.psacard.com/cert/${cleanCert}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        PSA Cert Page <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                </Button>
            </div>
            {details?.verified && (
                <div className="text-[11px] text-amber-950 dark:text-amber-100 space-y-0.5">
                    <p className="font-semibold">
                        {[details.year, details.brand, details.subject, details.variety, details.cardNumber ? `#${details.cardNumber}` : null].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300">
                        PSA Grade: <b>{details.gradeDescription || details.cardGrade || 'Verified'}</b>
                        {details.totalPopulation != null ? ` · Pop: ${details.totalPopulation}` : ''}
                        {details.populationHigher != null ? ` (${details.populationHigher} higher)` : ''}
                    </p>
                </div>
            )}
            {error && <p className="text-[11px] text-amber-800 dark:text-amber-300">{error}</p>}
        </div>
    );
}

