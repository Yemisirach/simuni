'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TopNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { label: 'Live Dispatch', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: 'Routes', path: '/routes' },
    { label: 'Telegram', path: '/telegram' },
    { label: 'Factory', path: '/factory-orders' },
    { label: 'Catalog', path: '/catalog' },
    { label: 'Staff', path: '/staff' },
  ];

  return (
    <header className="bg-primary-darker text-white sticky top-0 z-50 border-b border-[#222]">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Simuni Logo" className="w-8 h-8 rounded-full object-cover border border-surface-200" />
            <span className="font-serif text-xl font-bold tracking-wide hidden sm:block">Simuni</span>
          </Link>
          <span className="bg-accent text-primary-darker text-[9px] md:text-[10px] font-extrabold py-1 px-1.5 md:px-2 rounded tracking-wide uppercase hidden sm:block">
            Ethiopia B2B
          </span>
        </div>

        {/* Center: Navigation (Desktop) */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-1 xl:gap-2">
          <select className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-semibold mr-2 xl:mr-4 cursor-pointer outline-none focus:ring-2 focus:ring-accent appearance-none">
            <option>Addis Ababa Hub</option>
            <option>Dire Dawa Branch</option>
            <option>Adama Fulfillment</option>
          </select>
          
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm font-semibold px-2 xl:px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                pathname === item.path 
                  ? 'text-accent bg-accent/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions & User (Desktop) */}
        <div className="hidden md:flex items-center gap-3 xl:gap-4">
          <div className="hidden xl:flex items-center gap-1.5 bg-[#5E2A8C]/20 border border-[#5E2A8C] text-[#E2D4F0] px-2.5 py-1 rounded-full text-xs font-semibold">
            <div className="w-1.5 h-1.5 bg-[#9D4EDD] rounded-full shadow-[0_0_6px_#9D4EDD]" />
            telebirr Active
          </div>
          <button className="bg-accent text-primary-darker text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-accent-light transition-colors whitespace-nowrap">
            + Dispatch
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-sm text-white border-2 border-border cursor-pointer shrink-0">
            AH
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
        <div className="lg:hidden bg-primary-darker border-t border-[#222] px-4 py-4 space-y-4">
          <select className="w-full bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-accent appearance-none">
            <option>Addis Ababa Hub</option>
            <option>Dire Dawa Branch</option>
            <option>Adama Fulfillment</option>
          </select>
          
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.path 
                    ? 'text-accent bg-accent/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-[#222] flex flex-col gap-3">
            <button className="w-full bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors">
              + New Route / Dispatch
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-sm text-white border-2 border-border">
                AH
              </div>
              <span className="text-sm font-bold text-white">Admin Hub</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
