'use client';

import React from 'react';
import { useSidebar } from '@/context/SidebarContext';
import { StakeSidebar } from '@/components/layout/StakeSidebar';

export function StakeLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();

  return (
    <div className="min-h-screen bg-[#071824] text-white flex flex-col">
      {/* Fixed Left Sidebar */}
      <StakeSidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      {/* Main Content Area Offset for Sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
