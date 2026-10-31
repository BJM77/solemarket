
import Link from 'next/link';
import Image from 'next/image';
import { NewsletterSignup } from './NewsletterSignup';
import { SITE_NAME, brandConfig } from '@/config/brand';
import { Logo } from '../logo';
import { DEFAULT_SITE_CONFIG, type FooterConfig } from '@/lib/types/site-config';

export default function Footer({ config = DEFAULT_SITE_CONFIG.footer }: { config?: FooterConfig }) {
  return (
    <footer className="bg-background border-t border-border py-12 px-4 md:px-10">
      <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center mb-6">
            <Logo className="h-16 md:h-20" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mb-4">{config.tagline || brandConfig.company.tagline}</p>
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
        {config.columns.map((column) => (
          <div key={column.id}>
            <h2 className="font-black text-xs uppercase tracking-widest mb-6">{column.title}</h2>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              {column.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {config.showNewsletter && <div>
          <h2 className="font-black text-xs uppercase tracking-widest mb-6">Newsletter</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Get early access to weekly drops.</p>
          <NewsletterSignup />
        </div>}
      </div>
      <div className="max-w-[1440px] mx-auto mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/log" className="cursor-default hover:text-slate-500 transition-colors">
          © {new Date().getFullYear()} {config.copyright || `${brandConfig.company.legalName}. All rights reserved.`}
        </Link>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
