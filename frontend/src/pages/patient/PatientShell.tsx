import React from 'react';
import {
  HeartPulse,
  PlusCircle,
  Clock,
  Navigation,
  HelpCircle,
  LogOut,
  Shield,
  PhoneCall,
  ChevronDown,
  Upload,
  Activity,
  TrendingUp,
  Calendar,
  Download,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';

export type PatientTab =
  | 'overview'
  | 'upload'
  | 'analysis'
  | 'trends'
  | 'history'
  | 'pdf'
  | 'request'
  | 'requests'
  | 'tracking'
  | 'donors'
  | 'guidance';

interface PatientShellProps {
  activeTab: PatientTab;
  onSelectTab: (tab: PatientTab) => void;
  selectedTrackingId?: string | null;
  children: React.ReactNode;
}

export const PatientShell: React.FC<PatientShellProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const { user, logout, switchRole, patientRequests } = useAuth();
  const { navigate } = useRouter();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const navItems: Array<{ id: PatientTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; section: string }> = [
    { id: 'overview', label: 'Health Overview', icon: HeartPulse, section: 'HEALTH INTELLIGENCE' },
    { id: 'upload', label: 'Upload Report & OCR', icon: Upload, section: 'HEALTH INTELLIGENCE' },
    { id: 'analysis', label: 'Report Analysis', icon: Activity, section: 'HEALTH INTELLIGENCE' },
    { id: 'trends', label: 'Longitudinal Trends', icon: TrendingUp, section: 'HEALTH INTELLIGENCE' },
    { id: 'history', label: 'Medical History', icon: Calendar, section: 'HEALTH INTELLIGENCE' },
    { id: 'pdf', label: 'Download Health PDF', icon: Download, section: 'HEALTH INTELLIGENCE' },
    { id: 'request', label: 'Request Blood', icon: PlusCircle, badge: 'New', section: 'EMERGENCY COORDINATION' },
    { id: 'requests', label: 'My Requests', icon: Clock, badge: patientRequests.length > 0 ? `${patientRequests.length}` : undefined, section: 'EMERGENCY COORDINATION' },
    { id: 'tracking', label: 'Request Tracking', icon: Navigation, section: 'EMERGENCY COORDINATION' },
    { id: 'donors', label: 'Donors & Matching', icon: Users, section: 'EMERGENCY COORDINATION' },
    { id: 'guidance', label: 'Help & Guidance', icon: HelpCircle, section: 'EMERGENCY COORDINATION' },
  ];

  return (
    <div className="h-screen w-screen bg-canvas-sage p-2 sm:p-3 md:p-4 lg:p-5 flex items-stretch justify-center font-sans antialiased overflow-hidden">
      {/* Full-viewport Application Frame */}
      <div className="w-full max-w-[1600px] h-full bg-shell-bg rounded-2xl md:rounded-3xl shadow-shell border border-white/80 overflow-hidden flex flex-col md:flex-row">
        {/* Patient Sidebar */}
        <aside className="w-full md:w-72 h-full bg-shell-bg border-r border-shell-border flex flex-col p-4 shrink-0 select-none overflow-hidden">
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
                <span className="px-1.5 py-0.2 text-[9px] font-bold tracking-widest bg-emerald-600 text-white rounded font-mono">
                  CARE
                </span>
              </div>
              <p className="text-[11px] font-medium text-ink-secondary leading-tight">
                Personal Health & Emergency Portal
              </p>
            </div>
          </div>

          {/* Emergency Alert Banner */}
          <div className="mt-3 p-3 bg-pastel-rose-bg border border-pastel-rose-border rounded-2xl shrink-0">
            <div className="flex items-center gap-2 text-pastel-rose-text font-bold text-xs mb-0.5">
              <PhoneCall className="w-3.5 h-3.5 text-crimson" />
              <span>Medical Emergency?</span>
            </div>
            <p className="text-[11px] text-pastel-rose-text/90 leading-tight">
              Acute hemorrhage or trauma: dial <strong className="text-crimson font-bold">112 / 102</strong> immediately.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-0.5 space-y-4">
            {/* Grouped by Section */}
            {['HEALTH INTELLIGENCE', 'EMERGENCY COORDINATION'].map((sec) => (
              <div key={sec}>
                <div className="px-3 text-[10px] font-bold tracking-wider text-ink-secondary/70 uppercase mb-1.5">
                  {sec}
                </div>
                <div className="flex flex-col gap-1">
                  {navItems.filter(item => item.section === sec).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
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
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
            ))}
          </div>

          {/* Bottom: Patient Profile & Sign Out */}
          <div className="shrink-0 mt-2 pt-2 border-t border-shell-border relative">
            <div className="p-2 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs shrink-0">
                  {user?.avatarText || 'PS'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-primary truncate">
                    {user?.name || 'Priya Sharma'}
                  </p>
                  <p className="text-[10px] text-ink-secondary truncate">
                    {user?.title || 'Patient Portal Demo'}
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
                        switchRole('admin');
                        navigate('/admin');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-shell-bg text-ink-primary font-medium flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-teal-brand" />
                      Switch to Admin
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        switchRole('verifier');
                        navigate('/verifier');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-shell-bg text-ink-primary font-medium flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-teal-brand" />
                      Switch to Verifier
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
          {/* Patient Top Header Bar */}
          <header className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-shell-border bg-shell-bg/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h1 className="text-sm font-bold text-ink-primary">
                  Personal Health Intelligence & Emergency Blood Coordination
                </h1>
                <p className="text-[11px] text-ink-secondary">
                  Delhi NCR Trauma & Longitudinal Medical Network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Emergency Helpline Pill */}
              <a
                href="tel:112"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-pastel-rose-bg border border-pastel-rose-border text-crimson rounded-full text-xs font-bold shadow-xs hover:bg-crimson hover:text-white transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Emergency: 112</span>
              </a>

              {/* Quick Request Button */}
              <button
                onClick={() => onSelectTab('request')}
                className="flex items-center gap-2 px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-full text-xs md:text-sm font-semibold shadow-pill transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Request Blood</span>
              </button>
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
