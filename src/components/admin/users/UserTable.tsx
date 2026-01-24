
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Shield, Store, BadgeCheck, Ban, Eye } from "lucide-react";
import { format } from "date-fns";
import type { AdminUser } from '@/app/actions/admin-users';
import type { UserRole } from "@/lib/types";

interface UserTableProps {
    users: AdminUser[];
    onEditRole: (user: AdminUser) => void;
    onToggleBan: (userId: string, currentStatus: 'active' | 'banned') => void;
    isPending: boolean;
}

const RoleBadge = ({ role }: { role: UserRole }) => {
    switch (role) {
        case 'superadmin':
            return <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" /> Super Admin</Badge>;
        case 'admin':
            return <Badge className="bg-purple-600 hover:bg-purple-700 gap-1"><BadgeCheck className="h-3 w-3" /> Admin</Badge>;
        case 'seller':
            return <Badge variant="secondary" className="text-blue-600 bg-blue-100 hover:bg-blue-200 gap-1"><Store className="h-3 w-3" /> Seller</Badge>;
        default:
            return <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" /> Viewer</Badge>;
    }
};

export function UserTable({ users, onEditRole, onToggleBan, isPending }: UserTableProps) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
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
                            <TableCell>
                                <RoleBadge role={user.role || 'viewer'} />
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    !user.disabled ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                                    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                }`}>
                                    {!user.disabled ? 'Active' : 'Banned'}
                                </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {user.lastSignInTime ? format(new Date(user.lastSignInTime), 'MMM d, yyyy') : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                            Copy User ID
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onEditRole(user)}>
                                            Change Role...
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className={!user.disabled ? "text-red-600" : "text-green-600"}
                                            onClick={() => onToggleBan(user.id, !user.disabled ? 'active' : 'banned')}
                                        >
                                            {!user.disabled ? <><Ban className="mr-2 h-4 w-4" /> Ban User</> : "Unban User"}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
