import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Image 
                src="/logo.svg" 
                alt="Benched Logo" 
                width={120} 
                height={36} 
                className="h-9 w-auto dark:invert"
            />
        </div>
    );
}
