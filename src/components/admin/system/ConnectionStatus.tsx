
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, ExternalLink, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
    serviceName: string;
    endpoint: string;
    docsUrl?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ConnectionStatus({ serviceName, endpoint, docsUrl }: ConnectionStatusProps) {
    const [status, setStatus] = useState<Status>('idle');
    const [latency, setLatency] = useState<number | null>(null);
    const [message, setMessage] = useState<string>("");

    const runTest = async () => {
        // This function is now a placeholder.
        // In a real app, you would fetch(endpoint) here.
        setStatus('idle');
        setLatency(null);
        setMessage("This is a placeholder and does not perform a real test.");
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
                    disabled={true} // Disabled as it's a mock
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
            </CardFooter>
        </Card>
    );
}
