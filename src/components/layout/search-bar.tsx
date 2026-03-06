
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export function SearchBar({ className, inputClassName, buttonClassName }: { className?: string; inputClassName?: string; buttonClassName?: string; }) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
      <Input
        type="search"
        placeholder="Find It Here"
        aria-label="Search items"
        className={cn("w-full pl-10 bg-[#e7ebf3] dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-background-dark focus-within:border-primary/50", inputClassName)}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-white dark:bg-white/10 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
        <Button type="submit" aria-label="Submit search" className={cn("ml-2", !buttonClassName && "hidden", buttonClassName)}>Search</Button>
      </div>
    </form>
  );
}
