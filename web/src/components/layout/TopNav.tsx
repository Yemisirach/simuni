'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState('Addis Ababa Hub');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Live Dispatch', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: 'Routes', path: '/routes' },
    { label: 'Customers', path: '/customers' },
    { label: 'Telegram', path: '/telegram' },
    { label: 'Factory', path: '/factory-orders' },
    { label: 'Catalog', path: '/catalog' },
    { label: 'Staff', path: '/staff' },
  ];

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await fetchApi('/auth/sign-out', { method: 'POST' });
    } catch {
      // Ignore if session already cleared
    }
    router.push('/login');
  };

  return (
    <header className="bg-primary-darker text-white sticky top-0 z-50 border-b border-[#262626] shadow-sm">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img 
              src="/logo.jpg" 
              alt="Simuni" 
              className="w-8 h-8 rounded-full object-cover border border-accent/40 shadow-sm transition-transform group-hover:scale-105" 
            />
            <span className="font-serif text-xl font-bold tracking-tight text-white group-hover:text-accent transition-colors">
              Simuni
            </span>
          </Link>
          <span className="bg-accent/90 text-primary-darker text-[9px] md:text-[10px] font-extrabold py-0.5 px-2 rounded-full tracking-wider uppercase hidden sm:inline-block">
            Ethiopia B2B
          </span>
        </div>

        {/* Center: Navigation (Desktop) */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-1 xl:gap-2">
          {/* Hub Selector */}
          <div className="relative mr-2">
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="bg-[#262626] border border-[#3A3A3A] text-gray-200 text-xs font-semibold pl-3 pr-8 py-1.5 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-accent appearance-none hover:bg-[#2F2F2F] transition-colors"
            >
              <option value="Addis Ababa Hub" className="bg-[#1A1A1A] text-white">Addis Ababa Hub</option>
              <option value="Dire Dawa Branch" className="bg-[#1A1A1A] text-white">Dire Dawa Branch</option>
              <option value="Adama Fulfillment" className="bg-[#1A1A1A] text-white">Adama Fulfillment</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
              ▼
            </span>
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`text-xs xl:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-accent bg-accent/10 border border-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions & User (Desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#5E2A8C]/20 border border-[#5E2A8C]/50 text-[#E2D4F0] px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <div className="w-1.5 h-1.5 bg-[#A855F7] rounded-full shadow-[0_0_6px_#A855F7]" />
            telebirr Active
          </div>

          <Link
            href="/routes/create"
            className="bg-accent text-primary-darker text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-accent-light transition-all shadow-sm flex items-center gap-1 whitespace-nowrap"
          >
            <span>+</span> Dispatch
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
              title="Admin Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-xs text-primary-darker border border-amber-300 shadow-sm">
                AD
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1F1F1F] border border-[#333] rounded-xl shadow-xl py-2 z-50 text-xs">
                <div className="px-4 py-2 border-b border-[#333]">
                  <p className="font-bold text-white">Administrator</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">admin@simuni.et</p>
                </div>
                <Link
                  href="/staff"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Fleet & Staff
                </Link>
                <Link
                  href="/catalog"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Product Catalog
                </Link>
                <div className="border-t border-[#333] my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden text-white p-2 rounded-lg hover:bg-white/5"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#181818] border-t border-[#262626] px-4 py-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
            <span className="text-xs text-gray-400">Current Facility</span>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="bg-[#262626] border border-[#3A3A3A] text-white px-2 py-1 rounded text-xs outline-none"
            >
              <option value="Addis Ababa Hub" className="bg-[#1A1A1A]">Addis Ababa Hub</option>
              <option value="Dire Dawa Branch" className="bg-[#1A1A1A]">Dire Dawa Branch</option>
              <option value="Adama Fulfillment" className="bg-[#1A1A1A]">Adama Fulfillment</option>
            </select>
          </div>
          
          <nav className="grid grid-cols-2 gap-1 pt-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-accent bg-accent/10 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
            <Link
              href="/routes/create"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-accent text-primary-darker text-xs font-bold px-3 py-2 rounded-lg hover:bg-accent-light transition-colors"
            >
              + New Dispatch
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-rose-400 hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
