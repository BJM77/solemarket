
import Link from 'next/link';
import { Logo } from '../logo';
import { NewsletterSignup } from './NewsletterSignup';
import { SITE_NAME, brandConfig } from '@/config/brand';

const footerLinks = {
  Marketplace: [
    { name: 'Featured Assets', href: '/browse' },
    { name: 'Recently Verified', href: '/browse?sort=verified-desc' },
    { name: 'Auctions', href: '/browse?type=auction' },
    { name: 'Private Sales', href: '/sell' },
  ],
  Categories: [
    { name: 'Pokemon Cards', href: '/category/pokemon-cards' },
    { name: 'NBA Trading Cards', href: '/category/nba-trading-cards' },
    { name: 'Coins & Bullion', href: '/coins' },
    { name: 'Comics & Books', href: '/collectibles/comics' },
  ],
  Resources: [
    { name: 'Pokemon 1999 Guide', href: '/guide/topic/pokemon-base-set-1999' },
    { name: 'Michael Jordan Rookie', href: '/guide/topic/1986-fleer-basketball' },
    { name: '1930 Penny Value', href: '/guide/topic/1930-australian-penny' },
    { name: 'LeBron James Rookie', href: '/guide/topic/2003-topps-chrome-basketball' },
  ],
  Company: [
    { name: 'Our AI Tech', href: '/about' },
    { name: 'Grading Standards', href: '/how-it-works' },
    { name: 'Authenticity Guarantee', href: '/vault' },
    { name: 'Careers', href: '/about' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-background-dark border-t border-[#e7ebf3] dark:border-white/10 py-12 px-4 md:px-10">
      <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-primary mb-6">
            <Logo />
          </div>
          <p className="text-sm text-gray-500 max-w-xs mb-4">{brandConfig.company.tagline}</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Us
          </Link>
        </div>
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category}>
            <h5 className="font-black text-xs uppercase tracking-widest mb-6">{category}</h5>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              {links.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h5 className="font-black text-xs uppercase tracking-widest mb-6">Newsletter</h5>
          <p className="text-sm text-gray-500 mb-4">Get early access to weekly drops.</p>
          <NewsletterSignup />
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto mt-12 pt-8 border-t border-[#e7ebf3] dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
        <Link href="/log" className="cursor-default hover:text-gray-400 transition-colors">
          © {new Date().getFullYear()} {brandConfig.company.legalName}. All rights reserved.
        </Link>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
