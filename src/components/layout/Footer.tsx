
import Link from 'next/link';
import { Logo } from '../logo';
import { NewsletterSignup } from './NewsletterSignup';

const footerLinks = {
  Marketplace: [
    { name: 'Featured Assets', href: '/browse' },
    { name: 'Recently Verified', href: '/browse?sort=verified-desc' },
    { name: 'Auctions', href: '/browse?type=auction' },
    { name: 'Private Sales', href: '/sell' },
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
          <p className="text-sm text-gray-500 max-w-xs">Picksy is the premier marketplace for collectors</p>
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
          © {new Date().getFullYear()} Picksy AI Technologies Inc. All rights reserved.
        </Link>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
