import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavItem } from '../../types';

interface AppShellProps {
  activeTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  onNewRequest: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  criticalCount?: number;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onNewRequest,
  searchQuery,
  onSearchChange,
  criticalCount = 14,
  children,
}) => {
  return (
    <div className="min-h-screen bg-canvas-sage p-3 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased">
      {/* Centered Desktop Application Frame */}
      <div className="w-full max-w-[1360px] bg-shell-bg rounded-3xl md:rounded-4xl shadow-shell border border-white/80 overflow-hidden flex flex-col md:flex-row min-h-[880px] lg:min-h-[940px]">
        {/* Integrated Light Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          criticalCount={criticalCount}
        />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-shell-bg">
          {/* Header Bar */}
          <Header
            onNewRequest={onNewRequest}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {/* Dynamic Content Container */}
          <main className="flex-1 p-5 md:p-7 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
