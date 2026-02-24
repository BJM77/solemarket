import Image from 'next/image';
import Link from 'next/link';

const brands = [
  { name: 'Jordan', src: '/brand-logos/svg/jordan.svg', href: '/browse?category=Sneakers&search=jordan' },
  { name: 'Nike', src: '/brand-logos/svg/nike.svg', href: '/browse?category=Sneakers&search=nike' },
  { name: 'Kobe', src: '/brand-logos/svg/kobe.svg', href: '/browse?category=Sneakers&search=kobe' },
  { name: 'LeBron', src: '/brand-logos/svg/lebron.svg', href: '/browse?category=Sneakers&search=lebron' },
  { name: 'Curry', src: '/brand-logos/svg/curry.svg', href: '/browse?category=Sneakers&search=curry' },
  { name: 'Adidas', src: '/brand-logos/svg/adidas.svg', href: '/browse?category=Sneakers&search=adidas' },
  { name: 'New Balance', src: '/brand-logos/svg/new-balance.svg', href: '/browse?category=Sneakers&search=new+balance' },
  { name: 'Under Armour', src: '/brand-logos/svg/under-armour.svg', href: '/browse?category=Sneakers&search=under+armour' },
  { name: 'Reebok', src: '/brand-logos/svg/reebok.svg', href: '/browse?category=Sneakers&search=reebok' },
  { name: 'Puma', src: '/brand-logos/svg/puma.svg', href: '/browse?category=Sneakers&search=puma' },
  { name: 'Converse', src: '/brand-logos/svg/converse.svg', href: '/browse?category=Sneakers&search=converse' },
];

export default function BrandLogos() {
  return (
    <section className="py-12 bg-background border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <h2 className="text-center text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Featuring Top Brands
        </h2>
      </div>
      
      {/* Infinite Marquee Container */}
      <div className="relative w-full flex overflow-hidden group">
        {/* Gradient fades for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

        {/* Scrolling Content - Duplicate the array for infinite effect */}
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] items-center gap-16 md:gap-24 px-8 min-w-max" style={{ animationDuration: '30s' }}>
          {[...brands, ...brands, ...brands].map((brand, i) => (
            <Link 
              key={`${brand.name}-${i}`} 
              href={brand.href}
              className="relative h-12 md:h-16 w-28 md:w-36 flex items-center justify-center opacity-60 hover:opacity-100 transition-all duration-300 transform hover:scale-110 drop-shadow-[0_0_15px_rgba(242,108,13,0.15)] hover:drop-shadow-[0_0_20px_rgba(242,108,13,0.5)]"
              title={`Shop ${brand.name}`}
            >
              <Image
                src={brand.src}
                alt={`${brand.name} logo`}
                fill
                className="object-contain dark:invert filter"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
