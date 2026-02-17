
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isHovered: boolean;
    setIsHovered: React.Dispatch<React.SetStateAction<boolean>>;
    isSellingSection: boolean;
    setIsSellingSection: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isSellingSection, setIsSellingSection] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('picksy-sidebar-open');
        if (saved !== null) {
            setIsSidebarOpen(saved === 'true');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('picksy-sidebar-open', String(isSidebarOpen));
    }, [isSidebarOpen]);
    
    // This provider will wrap layouts that need a sidebar.
    return (
        <SidebarContext.Provider value={{ 
            isSidebarOpen, 
            setIsSidebarOpen, 
            isHovered, 
            setIsHovered,
            isSellingSection, 
            setIsSellingSection 
        }}>
            {children}
        </SidebarContext.Provider>
    );
}
