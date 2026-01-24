'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list' | 'montage';

interface ProductViewSwitcherProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export default function ProductViewSwitcher({ view, setView }: ProductViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setView('grid')}
        className={cn(view === 'grid' && 'bg-accent text-accent-foreground')}
        aria-label="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setView('list')}
        className={cn(view === 'list' && 'bg-accent text-accent-foreground')}
        aria-label="List View"
      >
        <List className="h-4 w-4" />
      </Button>
       <Button
        variant="outline"
        size="icon"
        onClick={() => setView('montage')}
        className={cn(view === 'montage' && 'bg-accent text-accent-foreground')}
        aria-label="Montage View"
      >
        <Grid className="h-4 w-4" />
      </Button>
    </div>
  );
}
