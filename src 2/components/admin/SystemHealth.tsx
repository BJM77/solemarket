'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { getSystemStatus } from '@/app/actions/system/system';
import { useUser } from '@/firebase';

export function SystemHealth() {
    const { user } = useUser();
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!user) return;
            try {
                const idToken = await user.getIdToken();
                const data = await getSystemStatus(idToken);
                setStatus(data);
            } catch (err) {
                console.error('Failed to fetch system status', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, [user]);

    if (isLoading) return null;
    if (!status || status.error) return null;

    return (
        <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    System Health & Connectivity
                </CardTitle>
                <Badge variant="outline" className="bg-background/50">
                    {status.environment}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className={`h-4 w-4 ${status.firebaseAdmin ? 'text-green-500' : 'text-destructive'}`} />
                            <span className="text-sm font-medium">Firebase Admin SDK</span>
                        </div>
                        {status.firebaseAdmin ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">READY</Badge>
                        ) : (
                            <Badge variant="destructive" className="animate-pulse">DISABLED</Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border">
                        <div className="flex items-center gap-2">
                            <Cpu className={`h-4 w-4 ${status.ai ? 'text-green-500' : 'text-destructive'}`} />
                            <span className="text-sm font-medium">Genkit AI Pipeline</span>
                        </div>
                        {status.ai ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">READY</Badge>
                        ) : (
                            <Badge variant="destructive" className="animate-pulse">DISABLED</Badge>
                        )}
                    </div>
                </div>

                {!status.firebaseAdmin && (
                    <p className="mt-4 text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                        ⚠️ Critical: Firebase Admin is running on safety fallback. Metadata and global stats may be inaccurate. Check your SERVICE_ACCOUNT_JSON or Secret Manager configuration.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
