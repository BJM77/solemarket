"use client";

import { useEffect, useState } from "react";
import { AdminUser } from "@/app/actions/admin-users";
import { getSellersAndBusinessUsers } from "@/app/actions/admin-sellers";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Settings2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { SellerDetailsSheet } from "./SellerDetailsSheet";
import { useToast } from "@/hooks/use-toast";

export function SellersTable() {
    const { toast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;

            const { users: fetched, error } = await getSellersAndBusinessUsers(idToken);
            if (error) throw new Error(error);
            setUsers(fetched);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRowClick = (user: AdminUser) => {
        setSelectedUser(user);
        setSheetOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search sellers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh List"}
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Seller</TableHead>
                            <TableHead>Account Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Member Since</TableHead>
                            <TableHead className="text-right">Manage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No sellers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow
                                    key={user.uid}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(user)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL || ''} />
                                                <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.displayName}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'business' ? 'default' : 'secondary'}>
                                            {user.role === 'business' ? 'Business Account' : 'Personal Seller'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.disabled ? (
                                            <Badge variant="destructive">Banned</Badge>
                                        ) : user.onStop ? (
                                            <Badge variant="destructive" className="bg-orange-600">Suspended</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {user.createdAt ? formatDistanceToNow(new Date((user.createdAt as any)?.seconds ? (user.createdAt as any).toDate() : user.createdAt), { addSuffix: true }) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SellerDetailsSheet
                user={selectedUser}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                refresh={fetchUsers}
            />
        </div>
    );
}
