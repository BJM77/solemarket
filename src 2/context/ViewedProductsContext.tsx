"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ViewedProductsContextType = {
    viewedProductIds: string[];
    markAsViewed: (productId: string) => void;
};

const ViewedProductsContext = createContext<ViewedProductsContextType | undefined>(
    undefined
);

export function ViewedProductsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [viewedProductIds, setViewedProductIds] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("viewedProductIds");
        if (stored) {
            try {
                setTimeout(() => {
                    setViewedProductIds(JSON.parse(stored));
                }, 0);
            } catch (e) {
                console.error("Failed to parse viewedProductIds from localStorage", e);
            }
        }
    }, []);

    const markAsViewed = (productId: string) => {
        setViewedProductIds((prev) => {
            if (prev.includes(productId)) return prev;
            const newIds = [productId, ...prev];
            // Limit to last 50 viewed items to prevent localStorage bloat
            const limitedIds = newIds.slice(0, 50);
            localStorage.setItem("viewedProductIds", JSON.stringify(limitedIds));
            return limitedIds;
        });
    };

    return (
        <ViewedProductsContext.Provider value={{ viewedProductIds, markAsViewed }}>
            {children}
        </ViewedProductsContext.Provider>
    );
}

export function useViewedProducts() {
    const context = useContext(ViewedProductsContext);
    if (context === undefined) {
        throw new Error(
            "useViewedProducts must be used within a ViewedProductsProvider"
        );
    }
    return context;
}
