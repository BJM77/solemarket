"use client";

import { useState } from "react";
import { AdminUser } from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { updateUserRole, setUserOnStop, toggleUserBan } from "@/app/actions/admin-users";
import { Loader2, Save, Ban, ShieldAlert, PlayCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SellerEditFormProps {
    user: AdminUser;
    refresh: () => void;
}

export function SellerEditForm({ user, refresh }: SellerEditFormProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState(user.role || 'viewer');

    // Handling status changes
    const handleRoleChange = async (newRole: string) => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const result = await updateUserRole(idToken, user.uid, newRole as any); // Cast as any to avoid strict type issues for now
            if (result.success) {
                toast({ title: "Role Updated", description: result.message });
                setRole(newRole as any);
                refresh();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async (shouldStop: boolean) => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const result = await setUserOnStop(idToken, user.uid, shouldStop, shouldStop ? "Admin Action" : undefined);
            if (result.success) {
                toast({ title: shouldStop ? "Suspended" : "Reactivated", description: result.message });
                refresh();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBan = async () => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const result = await toggleUserBan(idToken, user.uid, user.disabled ? 'banned' : 'active');
            if (result.success) {
                toast({ title: "Status Changed", description: result.message });
                refresh();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Display Name</Label>
                    <Input value={user.displayName || ''} disabled />
                    <p className="text-xs text-muted-foreground">Profile names are managed by the user.</p>
                </div>

                <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input value={user.email || ''} disabled />
                </div>

                <div className="grid gap-2">
                    <Label>Listing Limit</Label>
                    <Input value={user.role === 'business' ? 'Unlimited' : '20 Items'} disabled />
                    {user.role !== 'business' && <p className="text-xs text-amber-600">Upgrade to Business for unlimited listings.</p>}
                </div>

                <div className="grid gap-2">
                    <Label>Account Role</Label>
                    <Select value={role} onValueChange={handleRoleChange} disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="viewer">Viewer (No Selling)</SelectItem>
                            <SelectItem value="seller">Personal Seller (Limited)</SelectItem>
                            <SelectItem value="business">Business Account (Unlimited + Early Access)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Danger Zone</h4>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Suspension</Label>
                            <p className="text-xs text-muted-foreground">Temporarily hide all listings.</p>
                        </div>
                        <Button
                            variant={user.onStop ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => handleStop(!user.onStop)}
                            disabled={loading}
                        >
                            {user.onStop ? (
                                <><PlayCircle className="mr-2 h-4 w-4" /> Reactivate</>
                            ) : (
                                <><ShieldAlert className="mr-2 h-4 w-4" /> Suspend</>
                            )}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Account Ban</Label>
                            <p className="text-xs text-muted-foreground">Block login access completely.</p>
                        </div>
                        <Button
                            variant={user.disabled ? "outline" : "destructive"}
                            size="sm"
                            onClick={handleBan}
                            disabled={loading}
                        >
                            {user.disabled ? (
                                <><CheckCircle className="mr-2 h-4 w-4" /> Unban User</>
                            ) : (
                                <><Ban className="mr-2 h-4 w-4" /> Ban User</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
