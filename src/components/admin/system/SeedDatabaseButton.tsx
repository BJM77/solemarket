
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase/config"; // Client SDK

export function SeedDatabaseButton() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        if (!auth.currentUser) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "You must be logged in to perform this action.",
            });
            return;
        }

        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/seed', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to seed database');
            }

            toast({
                title: "Success",
                description: data.message,
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleSeed}
            disabled={loading}
            variant="outline"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                </>
            ) : (
                <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Database
                </>
            )}
        </Button>
    );
}
