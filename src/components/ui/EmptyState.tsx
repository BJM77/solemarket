import { ShoppingBag, Search } from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode; 
  actionLabel?: string;
  href?: string;
}

export default function EmptyState({ 
  title = "No items found", 
  description = "We couldn't find any items matching your criteria.", 
  icon = <Search className="h-8 w-8 text-muted-foreground" />,
  actionLabel, 
  href,
  className,
  children
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/10", className)}>
      <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-sm mt-2 mb-6">{description}</p>
      {actionLabel && href && (
        <Button asChild>
          <Link href={href}>{actionLabel}</Link>
        </Button>
      )}
      {children}
    </div>
  );
}
