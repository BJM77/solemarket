'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface MobileNavContextType {
  isPinned: boolean;
  setIsPinned: (value: boolean) => void;
  isVisible: boolean; // For scroll-based showing/hiding when unpinned
}

const MobileNavContext = createContext<MobileNavContextType>({
  isPinned: true,
  setIsPinned: () => {},
  isVisible: true,
});

export const MobileNavProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPinned, setIsPinned] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    // Check local storage for user preference
    const saved = localStorage.getItem('benched_bottom_nav_pinned');
    if (saved !== null) {
      setIsPinned(saved === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('benched_bottom_nav_pinned', String(isPinned));
    
    if (isPinned) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Scroll down -> hide (if scrolled past 50px)
      // Scroll up -> show
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPinned, lastScrollY]);

  return (
    <MobileNavContext.Provider value={{ isPinned, setIsPinned, isVisible }}>
      {children}
    </MobileNavContext.Provider>
  );
};

export const useMobileNav = () => useContext(MobileNavContext);
