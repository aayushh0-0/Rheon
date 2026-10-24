import React, { useState } from 'react';
import {
  ClipboardCheck,
  ListFilter,
  ShieldCheck,
  FileSearch,
  History,
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';

export type VerifierTab = 'overview' | 'queue' | 'detail' | 'safety' | 'history';

interface VerifierShellProps {
  activeTab: VerifierTab;
  onSelectTab: (tab: VerifierTab) => void;
  pendingCount?: number;
  children: React.ReactNode;
}

export const VerifierShell: React.FC<VerifierShellProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 6,
  children,
}) => {
  const { user, logout, switchRole } = useAuth();
  const { navigate } = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems: Array<{
    id: VerifierTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }> = [
    { id: 'overview', label: 'Verification Overview', icon: ClipboardCheck },
    {
      id: 'queue',
      label: 'Requests to Review',
      icon: ListFilter,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined,
      badgeColor: 'bg-pastel-rose-bg text-crimson border border-pastel-rose-border',
    },
    { id: 'detail', label: 'Clinical Inspection', icon: FileSearch },
    {
      id: 'safety',
      label: 'Safety Gate & Matrix',
      icon: ShieldCheck,
      badge: '6/6',
      badgeColor: 'bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border',
    },
    { id: 'history', label: 'Verification Audit Log', icon: History },
  ];

  return (
    <div className="h-screen w-screen bg-canvas-sage p-2 sm:p-3 md:p-4 lg:p-5 flex items-stretch justify-center font-sans antialiased overflow-hidden">
      {/* Full-viewport Application Frame */}
      <div className="w-full max-w-[1600px] h-full bg-shell-bg rounded-2xl md:rounded-3xl shadow-shell border border-white/80 overflow-hidden flex flex-col md:flex-row">
        {/* Verifier Sidebar */}
        <aside className="w-full md:w-64 h-full bg-shell-bg border-r border-shell-border flex flex-col p-4 shrink-0 select-none overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-2 shrink-0">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-pill flex items-center justify-center bg-white border border-shell-border shrink-0">
              <img src="/logo.png" alt="RHEON AI Logo" className="w-8 h-8 object-contain object-center" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-ink-primary font-sans">
                  RHEON AI
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold tracking-widest bg-teal-brand text-white rounded font-mono">
                  AUDIT
                </span>
              </div>
              <p className="text-[11px] font-medium text-ink-secondary leading-tight">
                Clinical Safety & Verification
              </p>
            </div>
          </div>

          {/* Read-Only Mode Badge */}
          <div className="mt-4 p-3 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl shrink-0">
            <div className="flex items-center gap-2 text-pastel-mint-text font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-brand" />
              <span>Read-Oriented Audit</span>
            </div>
            <p className="text-[11px] text-pastel-mint-text leading-tight">
              Evidence inspection, biological compatibility, and deterministic invariant verification.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-0.5">
            <div className="px-3 text-[10px] font-bold tracking-wider text-ink-secondary/70 uppercase mb-2">
              VERIFIER WORKSPACE
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-teal-brand text-white shadow-pill'
                        : 'text-ink-primary hover:bg-white hover:shadow-card'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-ink-secondary group-hover:text-teal-brand'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-shell-card text-ink-primary'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom: Verifier Profile & Sign Out */}
          <div className="shrink-0 mt-3 pt-3 border-t border-shell-border relative">
            <div className="p-2 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-teal-brand/10 border border-teal-brand/20 flex items-center justify-center text-teal-brand font-bold text-xs shrink-0">
                  {user?.avatarText || 'SR'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-primary truncate">
                    {user?.name || 'Dr. Sunita Rao'}
                  </p>
                  <p className="text-[10px] text-ink-secondary truncate">
                    {user?.title || 'Senior Safety Verifier'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title="User Menu"
                  className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-shell-bg rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showUserMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-shell-border rounded-2xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 text-[11px] border-b border-shell-border mb-1 text-ink-secondary">
                      Signed in as <strong className="text-ink-primary block truncate">{user?.email}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        switchRole('patient');
                        navigate('/patient');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-shell-bg text-ink-primary font-medium flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-teal-brand" />
                      Switch to Patient
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        switchRole('admin');
                        navigate('/admin');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-shell-bg text-ink-primary font-medium flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-teal-brand" />
                      Switch to Admin
                    </button>
                    <div className="my-1 border-t border-shell-border" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-pastel-rose-bg text-crimson font-bold flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-shell-bg">
          {/* Verifier Top Header Bar */}
          <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-shell-border bg-shell-bg/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-brand animate-pulse" />
              <div>
                <h1 className="text-sm font-bold text-ink-primary">
                  Clinical Immunohematology & Safety Gate
                </h1>
                <p className="text-[11px] text-ink-secondary">
                  Evidence-Based Clinical Verification Session • Delhi NCR Grid
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Gate Pass Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-pastel-lime-bg border border-pastel-lime-border text-pastel-lime-text rounded-full text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>6/6 Invariants Locked</span>
              </div>

              {/* Read Only Notice Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-shell-border rounded-full text-xs font-medium text-ink-secondary shadow-xs">
                <span>Read-Only Clinical Audit</span>
              </div>
            </div>
          </header>

          {/* Dynamic Content Container */}
          <main className="flex-1 p-4 md:p-6 lg:p-7 overflow-y-auto min-h-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
