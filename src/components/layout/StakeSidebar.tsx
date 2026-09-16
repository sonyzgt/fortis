'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  Home,
  Trophy,
  Coins,
  Gem,
  Grid3X3,
  Twitter,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const gameNavItems = [
  { href: '/jackpot',  label: 'Jackpot',  icon: Trophy,   badge: 'HOT' },
  { href: '/coinflip', label: 'Coinflip', icon: Coins,    badge: null  },
  { href: '/mines',    label: 'Mines',    icon: Gem,      badge: 'NEW' },
  { href: '/cups',     label: 'Cups',     icon: Grid3X3,  badge: null  },
];

const mainNavItems = [
  { href: '/',      label: 'Home',   icon: Home,     badge: null },
  { href: '/docs',  label: 'Docs',   icon: BookOpen, badge: null },
];

export function StakeSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-screen z-50 flex flex-col',
          'bg-[#0F212E] border-r border-[#213743]',
          'transition-all duration-300 ease-in-out select-none',
          collapsed ? 'w-16' : 'w-[240px]',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header / Logo Section */}
        <div
          className={`flex items-center h-14 border-b border-[#213743] flex-shrink-0 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <Link
            href="/"
            className="flex items-center min-w-0 flex-1 py-1"
            onClick={onMobileClose}
            title="FORTIS"
          >
            {!collapsed ? (
              <div className="h-11 w-full flex items-center">
                <img
                  src="/image/sidebar.png"
                  alt="FORTIS"
                  className="h-full w-auto object-contain max-w-[170px]"
                />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src="/image/sidebar.png"
                  alt="FORTIS"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </Link>

          {/* Collapse toggle (only shown when expanded on desktop) */}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-[#557086] hover:text-white hover:bg-[#213743] transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 px-2">
          {/* Main Links */}
          {mainNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={[
                  'group relative flex items-center rounded-lg text-sm font-semibold transition-colors',
                  collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-[#213743] text-white'
                    : 'text-[#B1BAD3] hover:bg-[#213743] hover:text-white',
                ].join(' ')}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* Floating Tooltip when collapsed */}
                {collapsed && (
                  <span className="fixed left-[72px] px-2.5 py-1 bg-[#1A2C38] border border-[#213743] text-white text-xs font-bold rounded-md shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Section Divider */}
          {!collapsed ? (
            <div className="px-3 pt-4 pb-1">
              <span className="text-[#557086] text-[11px] font-bold uppercase tracking-widest">
                Originals
              </span>
            </div>
          ) : (
            <div className="border-t border-[#213743] my-2 mx-1" />
          )}

          {/* Originals Game Links */}
          {gameNavItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={[
                  'group relative flex items-center rounded-lg text-sm font-semibold transition-colors',
                  collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-[#213743] text-white'
                    : 'text-[#B1BAD3] hover:bg-[#213743] hover:text-white',
                ].join(' ')}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span
                        className={[
                          'text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider',
                          badge === 'HOT'
                            ? 'bg-[#E74C3C] text-white'
                            : 'bg-[#00E701] text-[#071824]',
                        ].join(' ')}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}

                {/* Floating Tooltip when collapsed */}
                {collapsed && (
                  <span className="fixed left-[72px] px-2.5 py-1 bg-[#1A2C38] border border-[#213743] text-white text-xs font-bold rounded-md shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                    <span>{label}</span>
                    {badge && (
                      <span
                        className={[
                          'text-[9px] font-bold px-1 py-0.2 rounded',
                          badge === 'HOT'
                            ? 'bg-[#E74C3C] text-white'
                            : 'bg-[#00E701] text-[#071824]',
                        ].join(' ')}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Link (Twitter) */}
        <div className="border-t border-[#213743] p-2 flex-shrink-0">
          <a
            href="https://x.com/play_fortis"
            target="_blank"
            rel="noopener noreferrer"
            className={[
              'group relative flex items-center rounded-lg text-sm font-semibold transition-colors text-[#B1BAD3] hover:bg-[#213743] hover:text-white',
              collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5',
            ].join(' ')}
          >
            <Twitter className="w-5 h-5 shrink-0 text-[#1DA1F2]" />
            {!collapsed && <span className="truncate">Twitter / X</span>}

            {collapsed && (
              <span className="fixed left-[72px] px-2.5 py-1 bg-[#1A2C38] border border-[#213743] text-white text-xs font-bold rounded-md shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Twitter / X
              </span>
            )}
          </a>
        </div>
      </aside>
    </>
  );
}
