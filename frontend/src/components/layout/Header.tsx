import React from 'react';
import { Search, Bell, Plus, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onNewRequest: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRequest,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-shell-border bg-shell-bg/80 backdrop-blur-sm sticky top-0 z-20">
      {/* Search Bar Pill */}
      <div className="relative w-full sm:w-80 md:w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-secondary">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search hospital, blood group, dispatch ID..."
          className="w-full pl-10 pr-12 py-2 bg-white/95 border border-shell-border rounded-full text-xs md:text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all shadow-sm"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-shell-bg text-ink-secondary rounded border border-shell-border">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right Utility Group */}
      <div className="flex items-center gap-3 self-end sm:self-auto">
        {/* Network Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-shell-border rounded-full text-xs font-medium text-ink-primary shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>NCR Grid Live</span>
          <span className="text-ink-secondary font-mono text-[11px]">• 0.04s sync</span>
        </div>

        {/* Deterministic Safety Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-pastel-mint-bg border border-pastel-mint-border text-pastel-mint-text rounded-full text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-brand" />
          <span>6-Point Gate Active</span>
        </div>

        {/* Notification Bell */}
        <button
          title="Notifications"
          className="relative p-2 bg-white hover:bg-shell-card-subtle border border-shell-border rounded-full text-ink-secondary hover:text-ink-primary transition-colors shadow-sm"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-crimson rounded-full border-2 border-white"></span>
        </button>

        {/* New Emergency Request Button */}
        <button
          onClick={onNewRequest}
          className="flex items-center gap-2 px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-full text-xs md:text-sm font-semibold shadow-pill transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Emergency</span>
        </button>
      </div>
    </header>
  );
};
