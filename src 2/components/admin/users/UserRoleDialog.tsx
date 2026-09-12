
'use client';

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Store, User, BadgeCheck, Loader2, Eye } from "lucide-react";
import type { UserRole } from "@/lib/types";

interface UserRoleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentRole: UserRole;
    userId: string;
    userName: string;
    onUpdateRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export function UserRoleDialog({ isOpen, onClose, currentRole, userId, userName, onUpdateRole }: UserRoleDialogProps) {
    const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        if (selectedRole === currentRole) {
            onClose();
            return;
        }
        startTransition(async () => {
            await onUpdateRole(userId, selectedRole);
            onClose();
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage User Role</DialogTitle>
                    <DialogDescription>
                        Change permissions and access levels for <span className="font-bold text-foreground">{userName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <Select value={selectedRole} onValueChange={(val: UserRole) => setSelectedRole(val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-slate-500" />
                                        <span>Viewer</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="seller">
                                    <div className="flex items-center gap-2">
                                        <Store className="h-4 w-4 text-blue-500" />
                                        <span>Seller</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                        <BadgeCheck className="h-4 w-4 text-purple-500" />
                                        <span>Admin</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="superadmin">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-red-500" />
                                        <span>Super Admin</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
