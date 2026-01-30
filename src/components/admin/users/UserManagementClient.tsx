
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { UserTable } from './UserTable';
import { UserRoleDialog } from './UserRoleDialog';
import { CreateUserDialog } from './CreateUserDialog';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllUsers, updateUserRole, toggleUserBan, approveSeller, rejectSeller, setUserOnStop, issueWarning, type AdminUser, type ActionResponse } from '@/app/actions/admin-users';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerApprovals } from './SellerApprovals';



export default function UserManagementClient() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isPending, startTransition] = useTransition();

    const { toast } = useToast();

    // Dialog States
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

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
        setTimeout(() => {
            fetchUsers();
        }, 0);
    }, [fetchUsers]);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleAction = (action: () => Promise<ActionResponse>) => {
        startTransition(async () => {
            const result = await action();
            if (result.success) {
                toast({ title: "Success", description: result.message });
                await fetchUsers(); // Re-fetch users to get updated state
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleEditRole = (user: AdminUser) => {
        setSelectedUser(user);
        setIsRoleDialogOpen(true);
    };

    const handleUpdateRole = async (userId: string, newRole: UserRole) => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        handleAction(() => updateUserRole(idToken, userId, newRole));
    };

    const handleToggleBan = async (userId: string, currentStatus: 'active' | 'banned') => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        handleAction(() => toggleUserBan(idToken, userId, currentStatus));
    };

    const handleToggleStop = async (userId: string, onStop: boolean) => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;

        let reason = '';
        if (onStop) {
            const input = window.prompt("Reason for putting seller on stop:");
            if (input === null) return; // Cancelled
            reason = input;
        }

        handleAction(() => setUserOnStop(idToken, userId, onStop, reason));
    };

    const handleApproveSeller = async (userId: string) => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        handleAction(() => approveSeller(idToken, userId));
    };

    const handleRejectSeller = async (userId: string) => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const reason = window.prompt("Reason for rejection:");
        if (reason === null) return;
        handleAction(() => rejectSeller(idToken, userId, reason));
    };

    const handleWarnUser = async (userId: string) => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;

        const reason = window.prompt("Reason for warning (User will be banned on 2nd warning):");
        if (!reason) return;

        handleAction(() => issueWarning(idToken, userId, reason));
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users by name or email..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="superadmin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                            <SelectItem value="seller">Sellers</SelectItem>
                            <SelectItem value="viewer">Viewers</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create User
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="all">All Users</TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                        Seller Approvals
                        {users.filter(u => u.sellerStatus === 'pending').length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold">
                                {users.filter(u => u.sellerStatus === 'pending').length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <UserTable
                            users={filteredUsers}
                            onEditRole={handleEditRole}
                            onToggleBan={handleToggleBan}
                            onToggleStop={handleToggleStop}
                            onWarn={handleWarnUser}
                            isPending={isPending}
                        />
                    )}
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <SellerApprovals
                            users={users}
                            onApprove={handleApproveSeller}
                            onReject={handleRejectSeller}
                            isPending={isPending}
                        />
                    )}
                </TabsContent>
            </Tabs>


            {selectedUser && (
                <UserRoleDialog
                    isOpen={isRoleDialogOpen}
                    onClose={() => setIsRoleDialogOpen(false)}
                    currentRole={selectedUser.role || 'viewer'}
                    userId={selectedUser.id}
                    userName={selectedUser.displayName}
                    onUpdateRole={handleUpdateRole}
                />
            )}

            <CreateUserDialog
                isOpen={isCreateDialogOpen}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    fetchUsers(); // Refresh list after closing create dialog
                }}
            />
        </div>
    );
}
