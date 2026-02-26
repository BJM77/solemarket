import Image from 'next/image';
import { cn } from '@/lib/utils';
import { brandConfig } from '@/config/brand';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Desktop Logo */}
            <Image
                src={brandConfig.branding.logoUrl || '/shoe.png'}
                alt={`${brandConfig.company.name} Logo Desktop`}
                width={150}
                height={45}
                className="hidden md:block w-auto h-8 md:h-12"
                style={{ width: 'auto', height: 'auto' }}
                priority
            />
            {/* Mobile Logo */}
            <Image
                src="/benched.png"
                alt={`${brandConfig.company.name} Logo Mobile`}
                width={150}
                height={45}
                className="md:hidden w-auto h-10"
                style={{ width: 'auto', height: 'auto' }}
                priority
            />
        </div>
    );
}
