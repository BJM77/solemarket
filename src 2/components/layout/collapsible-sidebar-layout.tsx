
'use client';

import React, { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-provider';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';

function CollapsibleSidebarLayoutInner({ children, sidebar }: { children: ReactNode, sidebar: ReactNode }) {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          'relative bg-card border-r z-40 transition-all duration-300 ease-in-out hidden lg:block',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {sidebar}
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}


export function CollapsibleSidebarLayout({ children, sidebar }: { children: ReactNode, sidebar: ReactNode }) {
    return (
        <CollapsibleSidebarLayoutInner sidebar={sidebar}>
            {children}
        </CollapsibleSidebarLayoutInner>
    )
}
