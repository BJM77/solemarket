"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { migrateProductStatus } from "@/app/actions/migration";
import { Loader2, RefreshCw } from "lucide-react";

export function DataMigrationPanel() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleMigration = async () => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const result = await migrateProductStatus(idToken);

            if (result.success) {
                toast({
                    title: "Migration Complete",
                    description: result.message,
                });
            } else {
                toast({ variant: "destructive", title: "Migration Failed", description: result.error });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
                <h3 className="font-medium">Legacy Product Migration</h3>
                <p className="text-sm text-muted-foreground">Fix missing fields (status, isDraft, price, createdAt) on old products.</p>
            </div>
            <Button variant="outline" onClick={handleMigration} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Fix
            </Button>
        </div>
    );
}
