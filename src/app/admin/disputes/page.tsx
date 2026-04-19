
'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { MessageSquareWarning, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DisputesPage() {
    const disputes: any[] = []; // Removed mock data

    return (
        <div>
            <PageHeader
                title="Conflict Resolution Protocol"
                description="Arbitrate and manage user-reported disputes."
            />
            
            <Alert variant="destructive" className="mt-6 bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-bold">Staging / Demo Mode</AlertTitle>
                <AlertDescription>
                    This module is currently in development. Dispute arbitration is not yet active on the main network.
                </AlertDescription>
            </Alert>

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Open Disputes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {disputes.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dispute ID</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {disputes.map((dispute) => (
                                        <TableRow key={dispute.id}>
                                            <TableCell>{dispute.id}</TableCell>
                                            <TableCell>{dispute.item}</TableCell>
                                            <TableCell><Badge variant={dispute.status === 'pending' ? 'destructive' : 'secondary'}>{dispute.status}</Badge></TableCell>
                                            <TableCell>{dispute.date}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm">View Details</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <EmptyState
                                title="No Open Disputes"
                                description="All user disputes have been resolved."
                                icon={<MessageSquareWarning className="h-12 w-12 text-muted-foreground" />}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
