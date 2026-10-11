import React from 'react';
import { Calendar, RefreshCw, Clock } from 'lucide-react';

interface WelcomeHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Welcome to RHEON AI
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-brand/10 text-teal-brand border border-teal-brand/20">
            HQ Command
          </span>
        </div>
        <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
          Emergency blood intelligence, safety reserve preservation & multi-source logistics.
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        {/* Date / Time Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-shell-border rounded-full text-xs font-semibold text-ink-primary shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-teal-brand" />
          <span>Oct 5, 2026</span>
          <span className="text-ink-secondary">•</span>
          <Clock className="w-3.5 h-3.5 text-ink-secondary" />
          <span className="font-mono text-[11px]">14:35 IST</span>
        </div>

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-shell-card-subtle border border-shell-border rounded-full text-xs font-semibold text-ink-primary shadow-sm transition-all hover:border-teal-brand/40 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-teal-brand ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>
    </div>
  );
};
