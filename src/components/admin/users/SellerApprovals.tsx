
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { AdminUser } from '@/app/actions/admin-users';

interface SellerApprovalsProps {
    users: AdminUser[];
    onApprove: (userId: string) => void;
    onReject: (userId: string) => void;
    isPending: boolean;
}

export function SellerApprovals({ users, onApprove, onReject, isPending }: SellerApprovalsProps) {
    const pendingSellers = users.filter(u => u.sellerStatus === 'pending');

    if (pendingSellers.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                <Clock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No pending applications</h3>
                <p className="text-slate-500">All seller applications have been processed.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Applied Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pendingSellers.map((user) => (
                        <TableRow key={user.id} className={isPending ? 'opacity-50' : ''}>
                            <TableCell className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.photoURL} />
                                    <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{user.displayName}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {user.agreementAcceptedAt ? format(new Date(user.agreementAcceptedAt as any), 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                                    <Clock className="h-3 w-3" /> Pending
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
                                    onClick={() => onReject(user.id)}
                                    disabled={isPending}
                                >
                                    <X className="h-4 w-4 mr-1" /> Reject
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => onApprove(user.id)}
                                    disabled={isPending}
                                >
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
