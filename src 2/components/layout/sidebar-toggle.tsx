
'use client';

import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { useSidebar } from './sidebar-provider';

export function SidebarToggle() {
    const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
    
    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex"
        >
            {isSidebarOpen ? <PanelLeftClose /> : <PanelRightClose />}
            <span className="sr-only">Toggle sidebar</span>
        </Button>
    )
}
