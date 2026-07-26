'use client';

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { MessageSquareWarning, ShieldCheck, UserX } from "lucide-react";
import { getDisputes, resolveDispute, Dispute } from "./actions";
import { Loader2 } from "lucide-react";

export default function DisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDisputes();
    }, []);

    async function loadDisputes() {
        setIsLoading(true);
        try {
            const data = await getDisputes();
            setDisputes(data);
        } catch (error) {
            console.error("Failed to load disputes:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResolve(id: string, resolution: 'resolved_buyer' | 'resolved_seller') {
        if (!confirm(`Are you sure you want to resolve this in favor of the ${resolution === 'resolved_buyer' ? 'Buyer' : 'Seller'}?`)) {
            return;
        }
        
        try {
            await resolveDispute(id, resolution);
            await loadDisputes();
        } catch (error) {
            console.error("Error resolving dispute:", error);
            alert("Failed to resolve dispute. Please try again.");
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Conflict Resolution Protocol"
                description="Arbitrate and manage user-reported disputes."
            />

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Disputes ({disputes.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {disputes.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {disputes.map((dispute) => (
                                        <TableRow key={dispute.id}>
                                            <TableCell className="font-mono text-xs">{dispute.orderId}</TableCell>
                                            <TableCell>{dispute.reason}</TableCell>
                                            <TableCell>
                                                <Badge variant={dispute.status === 'pending' ? 'destructive' : 'secondary'}>
                                                    {dispute.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(dispute.createdAt.seconds * 1000).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {dispute.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handleResolve(dispute.id, 'resolved_buyer')}
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        >
                                                            <ShieldCheck className="w-4 h-4 mr-1" />
                                                            Favor Buyer
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleResolve(dispute.id, 'resolved_seller')}
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <UserX className="w-4 h-4 mr-1" />
                                                            Favor Seller
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <EmptyState
                                title="No Open Disputes"
                                description="All user disputes have been resolved or none exist."
                                icon={<MessageSquareWarning className="h-12 w-12 text-muted-foreground" />}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
