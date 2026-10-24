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
  onLogout?: () => void;
  onSwitchRole?: (role: 'patient' | 'verifier') => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onNewRequest,
  searchQuery,
  onSearchChange,
  criticalCount = 14,
  onLogout,
  onSwitchRole,
  children,
}) => {
  return (
    <div className="h-screen w-screen bg-canvas-sage p-2 sm:p-3 md:p-4 lg:p-5 flex items-stretch justify-center font-sans antialiased overflow-hidden">
      {/* Full-viewport Application Frame */}
      <div className="w-full max-w-[1600px] h-full bg-shell-bg rounded-2xl md:rounded-3xl shadow-shell border border-white/80 overflow-hidden flex flex-col md:flex-row">
        {/* Integrated Light Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          criticalCount={criticalCount}
          onLogout={onLogout}
          onSwitchRole={onSwitchRole}
        />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-shell-bg">
          {/* Header Bar */}
          <Header
            onNewRequest={onNewRequest}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {/* Dynamic Content Container */}
          <main className="flex-1 p-4 md:p-6 lg:p-7 overflow-y-auto min-h-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
