
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    userId: string;
    userEmail?: string;
    details: string;
    status: 'success' | 'warning' | 'error';
    timestamp: Timestamp;
}

export function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLogs() {
            try {
                // In a real scenario, ensure this logic matches your firestore structure
                const q = query(
                    collection(db, 'audit_logs'),
                    orderBy('timestamp', 'desc'),
                    limit(20)
                );

                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setLogs([]);
                } else {
                    const fetchedLogs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as AuditLog[];
                    setLogs(fetchedLogs);
                }
            } catch (err: any) {
                console.error("Error fetching audit logs:", err);
                // Don't show critical error to UI if collection missing, just empty
                if (err.code === 'permission-denied') {
                    setError("You do not have permission to view audit logs.");
                } else if (err.code === 'failed-precondition') {
                    // Missing index?
                    setError("Index missing for audit logs.");
                } else {
                    // Start with empty logs if collection doesn't exist or other error
                    setLogs([]);
                }
            } finally {
                setLoading(false);
            }
        }

        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12 text-destructive gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/20">
                <p>No audit logs found.</p>
                <p className="text-xs mt-1">System events will appear here.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                {log.timestamp?.toMillis ?
                                    formatDistanceToNow(log.timestamp.toMillis(), { addSuffix: true }) :
                                    'Unknown'
                                }
                            </TableCell>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell className="text-sm">{log.userEmail || log.userId || 'System'}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    log.status === 'success' ? 'default' :
                                        log.status === 'error' ? 'destructive' :
                                            'secondary'
                                } className={
                                    log.status === 'success' ? 'bg-green-500 hover:bg-green-600' : ''
                                }>
                                    {log.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground max-w-[200px] truncate">
                                {log.details}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
