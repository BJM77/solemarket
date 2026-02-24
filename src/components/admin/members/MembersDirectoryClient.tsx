'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users as UsersIcon, Clock } from "lucide-react";
import { getAllUsers, type AdminUser } from '@/app/actions/admin-users';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

export default function MembersDirectoryClient() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
            toast({ title: "Authentication Error", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        const result = await getAllUsers(idToken);
        if (result.users) {
            setUsers(result.users);
        } else {
            toast({ title: "Error fetching users", description: result.error, variant: "destructive" });
        }
        setIsLoading(false);
    }, [setIsLoading, toast, setUsers]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // 48 hours threshold for "Recently Active / Logged In"
    const isRecentlyActive = (lastSignInTime?: string) => {
        if (!lastSignInTime) return false;
        try {
            const date = new Date(lastSignInTime);
            return differenceInDays(new Date(), date) <= 2;
        } catch {
            return false;
        }
    };

    const recentlyActiveUsers = filteredUsers
        .filter(user => isRecentlyActive(user.lastSignInTime))
        .sort((a, b) => {
            const dateA = a.lastSignInTime ? new Date(a.lastSignInTime).getTime() : 0;
            const dateB = b.lastSignInTime ? new Date(b.lastSignInTime).getTime() : 0;
            return dateB - dateA; // Descending
        });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'superadmin': return 'border-red-500 text-red-700 bg-red-50';
            case 'admin': return 'border-purple-500 text-purple-700 bg-purple-50';
            case 'seller': return 'border-blue-500 text-blue-700 bg-blue-50';
            default: return 'border-gray-300 text-gray-700 bg-gray-50';
        }
    };


    const renderTable = (data: AdminUser[]) => (
        <div className="rounded-md border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead className="text-right">Last Sign In</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                No members found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((user) => (
                            <TableRow key={user.id}>
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
                                    <Badge variant="outline" className={`capitalize ${getRoleBadgeColor(user.role || 'viewer')}`}>
                                        {user.role || 'viewer'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {!user.disabled ? (
                                        <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                                            Disabled
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">
                                    {user.lastSignInTime ? (
                                        <div className="flex flex-col items-end">
                                            <span>{format(new Date(user.lastSignInTime), 'MMM d, yyyy')}</span>
                                            <span className="text-xs">{format(new Date(user.lastSignInTime), 'h:mm a')}</span>
                                        </div>
                                    ) : (
                                        'Never'
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members by name or email..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="active" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Recently Active (48h)
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-2">
                        <UsersIcon className="h-4 w-4" />
                        All Members
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        renderTable(recentlyActiveUsers)
                    )}
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        renderTable(filteredUsers)
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
