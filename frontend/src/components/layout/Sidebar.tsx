import React from 'react';
import {
  LayoutDashboard,
  Flame,
  Database,
  Truck,
  Navigation,
  GitMerge,
  ShieldCheck,
  Cpu,
  Building2,
  Users,
  Settings,
} from 'lucide-react';
import { NavItem } from '../../types';

interface SidebarProps {
  activeTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  criticalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  criticalCount = 14,
}) => {
  const navSections = [
    {
      title: 'MAIN MENU',
      items: [
        {
          id: 'command-center' as NavItem,
          label: 'Command Center',
          icon: LayoutDashboard,
        },
        {
          id: 'emergency-requests' as NavItem,
          label: 'Emergency Queue',
          icon: Flame,
          badge: criticalCount > 0 ? `${criticalCount}` : undefined,
          badgeColor: 'bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border',
        },
        {
          id: 'inventory-reserves' as NavItem,
          label: 'Inventory Reserves',
          icon: Database,
        },
      ],
    },
    {
      title: 'LOGISTICS',
      items: [
        {
          id: 'route-dispatch' as NavItem,
          label: 'Route Dispatch',
          icon: Truck,
        },
        {
          id: 'drone-telemetry' as NavItem,
          label: 'Drone Telemetry',
          icon: Navigation,
          badge: 'LIVE',
          badgeColor: 'bg-pastel-mint-bg text-pastel-mint-text border border-pastel-mint-border',
        },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          id: 'candidate-matcher' as NavItem,
          label: 'Candidate Matcher',
          icon: GitMerge,
        },
        {
          id: 'safety-audit' as NavItem,
          label: 'Safety Gate Audit',
          icon: ShieldCheck,
          badge: '6/6',
          badgeColor: 'bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border',
        },
        {
          id: 'simulation-studio' as NavItem,
          label: 'Simulation Studio',
          icon: Cpu,
        },
      ],
    },
    {
      title: 'REGISTRY',
      items: [
        {
          id: 'facility-registry' as NavItem,
          label: 'Trauma Centers',
          icon: Building2,
        },
        {
          id: 'donors-standby' as NavItem,
          label: 'Donor Standby',
          icon: Users,
        },
      ],
    },
  ];

  return (
    <aside className="w-full md:w-64 h-full bg-shell-bg border-r border-shell-border flex flex-col p-4 shrink-0 select-none overflow-hidden">
      {/* Top: Logo (fixed) */}
      <div className="flex items-center gap-3 px-3 py-2 shrink-0">
        <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-pill flex items-center justify-center bg-white border border-shell-border shrink-0">
          <img
            src="/logo.png"
            alt="RHEON AI Logo"
            className="w-full h-full object-contain p-0.5"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-ink-primary font-sans">
              RHEON AI
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold tracking-widest bg-crimson text-white rounded font-mono">
              NCR
            </span>
          </div>
          <p className="text-[11px] font-medium text-ink-secondary leading-tight">
            Emergency Blood Logistics
          </p>
        </div>
      </div>

      {/* Middle: Navigation (scrollable if needed) */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-0.5">
        <div className="flex flex-col gap-5">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-ink-secondary/70 uppercase">
                {section.title}
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {section.items.map((item) => {
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
                            isActive
                              ? 'text-white'
                              : 'text-ink-secondary group-hover:text-teal-brand'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badgeColor || 'bg-shell-card text-ink-primary'
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
      </div>

      {/* Bottom: User Profile (always visible, never cut off) */}
      <div className="shrink-0 mt-3 pt-3 border-t border-shell-border">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-shell-border shadow-card hover:border-teal-brand/30 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-8 h-8 rounded-full bg-teal-brand/10 border border-teal-brand/20 flex items-center justify-center text-teal-brand font-bold text-xs shrink-0">
              AR
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink-primary truncate">
                Dr. Ayush Rawat
              </p>
              <p className="text-[10px] text-ink-secondary truncate">
                Chief Medical Officer
              </p>
            </div>
          </div>
          <button
            title="Account Settings"
            className="p-1.5 text-ink-secondary hover:text-teal-brand hover:bg-shell-bg rounded-lg transition-colors shrink-0 ml-1"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
