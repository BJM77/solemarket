
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, ExternalLink, HelpCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from '@/lib/firebase/config';

interface ConnectionStatusProps {
    serviceName: string;
    endpoint: string;
    docsUrl?: string;
    managementUrl?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ConnectionStatus({ serviceName, endpoint, docsUrl, managementUrl }: ConnectionStatusProps) {
    const [status, setStatus] = useState<Status>('idle');
    const [latency, setLatency] = useState<number | null>(null);
    const [message, setMessage] = useState<string>("");

    const runTest = async () => {
        if (!endpoint) return;

        setStatus('loading');
        setMessage("");
        setLatency(null);
        const startTime = Date.now();

        try {
            const headers: HeadersInit = {};
            
            // Try to get current user token if authenticated
            if (auth.currentUser) {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(endpoint, { headers });
            const contentType = res.headers.get("content-type");
            
            let data: any = {};
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                // For non-JSON responses (like XML feeds), just check if the response is OK
                if (res.ok) {
                    setStatus('success');
                    setLatency(Date.now() - startTime); // Manual latency since it's not in the body
                    return;
                }
            }

            if (res.ok && (data.status === 'healthy' || data.status === 'success')) {
                setStatus('success');
                setLatency(data.latency);
            } else {
                setStatus('error');
                setLatency(data.latency);
                setMessage(data.error || data.details?.message || data.details?.error || "Service unhealthy");
            }
        } catch (error: any) {
            console.error("Connection test failed:", error);
            setStatus('error');
            setMessage(error.message || "Network error");
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium">{serviceName}</CardTitle>
                    {status === 'idle' && <HelpCircle className="h-5 w-5 text-gray-400" />}
                    {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                        className={cn(status === 'success' && "bg-green-500 hover:bg-green-600")}>
                        {status === 'idle' ? 'Unknown' : status === 'loading' ? 'Testing...' : status === 'success' ? 'Online' : 'Offline'}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latency</span>
                    <span className={cn("text-sm font-mono", !latency && "text-muted-foreground/50")}>
                        {latency ? `${latency}ms` : '--'}
                    </span>
                </div>
                {message && (
                    <div className={cn("mt-3 text-xs p-2 rounded", "bg-yellow-500/10 text-yellow-700")}>
                        {message}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0 gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={runTest}
                    disabled={status === 'loading'}
                >
                    <RefreshCw className={cn("mr-2 h-3 w-3")} />
                    Test Connection
                </Button>
                {docsUrl && (
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" asChild>
                        <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                )}
                {managementUrl && (
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" asChild>
                        <a href={managementUrl}>
                            <Mail className="h-4 w-4" />
                        </a>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
