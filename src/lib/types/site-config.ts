export interface CategoryCardItem {
  id: string;
  name: string;
  logo?: string;
  iconName?: string;
  href: string;
  color?: string;
}

export interface HomepageSectionConfig {
  id: string;
  type: 'lineup' | 'card_room' | 'vault' | 'custom';
  title: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  customClasses?: string;
  items: CategoryCardItem[];
}

export interface HeroButtonConfig {
  id: string;
  label: string;
  href: string;
  bgColor: string; // e.g. 'bg-primary' or hex code
  textColor: string;
}

export interface HeroConfig {
  h1TitleLine1: string;
  h1TitleLine2: string;
  subText1: string;
  subText2: string;
  buttons: HeroButtonConfig[];
}

export interface BrandingTheme {
  primaryColor: string; // HSL or Hex string (e.g. '25 90% 50%' or '#f26c0d')
  buttonColor: string;
  buttonTextColor: string;
  tickerBgColor: string;
  tickerTextColor: string;
  logoUrl: string;       // Secondary court brand image (/benched.png)
  siteLogoUrl: string;   // Main header site logo (/benchedlogo.png)
  logoDarkUrl: string;
}

export interface MenuItemSubItem {
  label: string;
  href: string;
  iconName?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
  subItems?: MenuItemSubItem[];
}

export interface SiteConfig {
  branding: BrandingTheme;
  hero: HeroConfig;
  sections: HomepageSectionConfig[];
  menus: MenuItem[];
  updatedAt?: number;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  branding: {
    primaryColor: '25 90% 50%',
    buttonColor: '#f26c0d',
    buttonTextColor: '#ffffff',
    tickerBgColor: '#18181b',
    tickerTextColor: '#ffffff',
    logoUrl: '/benched.png',
    siteLogoUrl: '/benchedlogo.png',
    logoDarkUrl: '/benchedlogo.png',
  },
  hero: {
    h1TitleLine1: "AUSTRALIA'S PREMIER",
    h1TitleLine2: 'MARKETPLACE.',
    subText1: 'Buy Footwear, Collector Cards and Australian Coins & Notes.',
    subText2: 'Metro Perth Collection or Express Freight Solutions Available',
    buttons: [
      { id: '1', label: 'Shop Sneakers', href: '/shoes', bgColor: '#f26c0d', textColor: '#ffffff' },
      { id: '2', label: 'Shop Cards', href: '/cards', bgColor: '#0f172a', textColor: '#ffffff' },
      { id: '3', label: 'Shop Coins', href: '/coins', bgColor: '#ca8a04', textColor: '#ffffff' },
    ],
  },
  sections: [
    {
      id: 'sec-lineup',
      type: 'lineup',
      title: 'Shop the Lineup',
      subtitle: 'Browse premier sneaker brands authenticated by experts',
      enabled: true,
      order: 1,
      customClasses: 'py-16 bg-black',
      items: [
        { id: 'l1', name: 'Jordan', logo: '/brand-logos/svg/jordan.svg', href: '/shoes?subCategory=Jordan&brand=Jordan', color: 'bg-red-50/50 dark:bg-red-950/10' },
        { id: 'l2', name: 'Nike', logo: '/brand-logos/svg/nike.svg', href: '/shoes?subCategory=Nike&brand=Nike', color: 'bg-orange-50/50 dark:bg-orange-950/10' },
        { id: 'l3', name: 'Adidas', logo: '/brand-logos/svg/adidas.svg', href: '/shoes?subCategory=Adidas&brand=Adidas', color: 'bg-blue-50/50 dark:bg-blue-950/10' },
        { id: 'l4', name: 'New Balance', logo: '/brand-logos/svg/new-balance.svg', href: '/shoes?subCategory=New%20Balance&brand=New%20Balance', color: 'bg-green-50/50 dark:bg-green-950/10' },
        { id: 'l5', name: 'Under Armour', logo: '/brand-logos/svg/under-armour.svg', href: '/shoes?subCategory=Under%20Armour&brand=Under%20Armour', color: 'bg-slate-100/50 dark:bg-slate-800/10' },
        { id: 'l6', name: 'Reebok', logo: '/brand-logos/svg/reebok.svg', href: '/shoes?subCategory=Reebok&brand=Reebok', color: 'bg-blue-50/50 dark:bg-blue-950/10' },
        { id: 'l7', name: 'Puma', logo: '/brand-logos/svg/puma.svg', href: '/shoes?subCategory=Puma&brand=Puma', color: 'bg-yellow-50/50 dark:bg-yellow-950/10' },
        { id: 'l8', name: 'Converse', logo: '/brand-logos/svg/converse.svg', href: '/shoes?subCategory=Converse&brand=Converse', color: 'bg-zinc-100/50 dark:bg-zinc-800/10' },
        { id: 'l9', name: 'Kobe', logo: '/brand-logos/svg/kobe.svg', href: '/shoes?subCategory=Kobe&brand=Kobe', color: 'bg-purple-50/50 dark:bg-purple-950/10' },
      ]
    },
    {
      id: 'sec-card-room',
      type: 'card_room',
      title: 'The Card Room',
      subtitle: 'Explore high-value trading cards, grails & PSA slabs',
      enabled: true,
      order: 2,
      customClasses: 'py-16 bg-zinc-950/60 border-t border-white/5',
      items: [
        { id: 'c1', name: 'Jordan', logo: '/brand-logos/svg/jordan.svg', href: '/cards?subCategory=Jordan', color: 'bg-red-50/50 dark:bg-red-950/10' },
        { id: 'c2', name: 'Kobe', logo: '/brand-logos/svg/kobe.svg', href: '/cards?subCategory=Kobe', color: 'bg-purple-50/50 dark:bg-purple-950/10' },
        { id: 'c3', name: 'Curry', logo: '/brand-logos/svg/curry.svg', href: '/cards?subCategory=Curry', color: 'bg-blue-50/50 dark:bg-blue-950/10' },
        { id: 'c4', name: 'Pokemon', iconName: 'Zap', href: '/cards?subCategory=Pok%C3%A9mon', color: 'bg-yellow-50 dark:bg-yellow-950/20' },
        { id: 'c5', name: 'Top 100', iconName: 'Medal', href: '/cards?subCategory=Top%20100', color: 'bg-blue-50 dark:bg-blue-950/20' },
        { id: 'c6', name: 'Wembanyama', iconName: 'Trophy', href: '/cards?subCategory=Wembanyama', color: 'bg-emerald-50 dark:bg-emerald-950/20' },
      ]
    },
    {
      id: 'sec-vault',
      type: 'vault',
      title: 'The Vault',
      subtitle: 'Rare Australian decimal coins, gold, silver & bank notes',
      enabled: true,
      order: 3,
      customClasses: 'py-16 bg-black border-t border-white/5',
      items: [
        { id: 'v1', name: 'Australian Coins', iconName: 'Coins', href: '/coins?subCategory=Australian+Coins' },
        { id: 'v2', name: 'World Coins', iconName: 'Globe', href: '/coins?subCategory=World+Coins' },
        { id: 'v3', name: 'Gold', iconName: 'Flame', href: '/coins?subCategory=Gold' },
        { id: 'v4', name: 'Silver', iconName: 'Circle', href: '/coins?subCategory=Silver' },
        { id: 'v5', name: 'Proof Sets', iconName: 'Box', href: '/coins?subCategory=Proof+Sets' },
        { id: 'v6', name: 'Bank Notes', iconName: 'Banknote', href: '/coins?subCategory=Banknotes' },
      ]
    }
  ],
  menus: [
    { id: 'm1', label: 'Shoes', href: '/shoes', enabled: true, order: 1 },
    { id: 'm2', label: 'Cards', href: '/cards', enabled: true, order: 2 },
    { id: 'm3', label: 'Coins', href: '/coins', enabled: true, order: 3 },
    { id: 'm4', label: 'Fundraising', href: '/club-fundraising', enabled: true, order: 4 },
    { 
      id: 'm5', 
      label: 'The Lineup', 
      href: '#', 
      enabled: true, 
      order: 5,
      subItems: [
        { label: 'Browse All', href: '/browse', iconName: 'Store' },
        { label: 'Top 10 Stores', href: '/top-stores', iconName: 'TrendingUp' },
        { label: 'Multi-Listing Deals', href: '/multilisting-deals', iconName: 'LayoutGrid' },
      ]
    }
  ]
};
