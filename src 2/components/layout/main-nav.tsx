
"use client"

import { MainNavLinks } from './MainNavLinks';

export function MainNav() {
  return (
    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
      <MainNavLinks />
    </nav>
  );
}
