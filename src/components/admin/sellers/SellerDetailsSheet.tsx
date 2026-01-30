"use client";

import { useState } from "react";
import { AdminUser } from "@/app/actions/admin-users";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerEditForm } from "./SellerEditForm";
import { SellerProductsList } from "./SellerProductsList";
import { getSellerProducts } from "@/app/actions/admin-sellers";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SellerDetailsSheetProps {
    user: AdminUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    refresh: () => void;
}

export function SellerDetailsSheet({ user, open, onOpenChange, refresh }: SellerDetailsSheetProps) {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [activeTab, setActiveTab] = useState("details");

    // Fetch products when user changes or tab switches to products
    const fetchProducts = async () => {
        if (!user) return;
        setLoadingProducts(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;

            const { products: fetched, error } = await getSellerProducts(idToken, user.uid);
            if (error) throw new Error(error);
            setProducts(fetched);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Failed to load products", description: e.message });
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === "products") {
            fetchProducts();
        }
    };

    if (!user) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL || ''} />
                            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <SheetTitle>{user.displayName}</SheetTitle>
                            <SheetDescription>{user.email}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details & Settings</TabsTrigger>
                        <TabsTrigger value="products">Manage Listings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <SellerEditForm user={user} refresh={refresh} />
                    </TabsContent>

                    <TabsContent value="products">
                        {loadingProducts ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <SellerProductsList products={products} refresh={fetchProducts} />
                        )}
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
