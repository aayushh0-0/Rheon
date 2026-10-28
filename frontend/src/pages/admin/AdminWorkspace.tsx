import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { CommandCenter } from '../CommandCenter';
import { InventoryView } from '../InventoryView';
import { LogisticsView } from '../LogisticsView';
import { SafetyAuditView } from '../SafetyAuditView';
import { FacilityRegistryView } from '../FacilityRegistryView';
import { NewRequestModal } from '../../components/dashboard/NewRequestModal';
import { RequestDetailsModal } from '../../components/dashboard/RequestDetailsModal';
import {
  getMetrics,
  getInventorySummary,
  getDemandTrend,
  getEmergencyRequests,
  createEmergencyRequest,
} from '../../services/api';
import {
  NavItem,
  MetricCardData,
  InventoryGroupDistribution,
  DemandDayData,
  EmergencyRequest,
  BloodRequestCreate,
} from '../../types';
import { AdaptiveReplanView } from './AdaptiveReplanView';
import { CandidateMatcherView } from './CandidateMatcherView';
import { AdminAppointmentsView } from './AdminAppointmentsView';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';

export const AdminWorkspace: React.FC = () => {
  const { logout, switchRole } = useAuth();
  const { path, navigate } = useRouter();

  // Map route path to NavItem
  const getTabFromPath = (): NavItem => {
    if (path.includes('/admin/inventory')) return 'inventory-reserves';
    // Route Dispatch and former Drone Telemetry both resolve to logistics
    if (path.includes('/admin/logistics') || path.includes('/admin/telemetry')) return 'route-dispatch';
    if (path.includes('/admin/safety')) return 'safety-audit';
    if (path.includes('/admin/facilities')) return 'facility-registry';
    if (path.includes('/admin/requests')) return 'emergency-requests';
    if (path.includes('/admin/matcher')) return 'candidate-matcher';
    if (path.includes('/admin/simulation')) return 'simulation-studio';
    if (path.includes('/admin/donors')) return 'donors-standby';
    if (path.includes('/admin/appointments')) return 'appointments';
    return 'command-center';
  };

  const [activeTab, setActiveTab] = useState<NavItem>(getTabFromPath);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);

  // Dashboard Data State
  const [metrics, setMetrics] = useState<MetricCardData[]>([]);
  const [inventoryDistribution, setInventoryDistribution] = useState<InventoryGroupDistribution[]>([]);
  const [demandData, setDemandData] = useState<DemandDayData[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronize route with activeTab
  useEffect(() => {
    const tab = getTabFromPath();
    setActiveTab(tab);
  }, [path]);

  const handleSelectTab = (tab: NavItem) => {
    setActiveTab(tab);
    switch (tab) {
      case 'command-center':
        navigate('/admin');
        break;
      case 'emergency-requests':
        navigate('/admin/requests');
        break;
      case 'inventory-reserves':
        navigate('/admin/inventory');
        break;
      case 'route-dispatch':
      case 'drone-telemetry':
        navigate('/admin/logistics');
        break;
      case 'safety-audit':
        navigate('/admin/safety');
        break;
      case 'facility-registry':
        navigate('/admin/facilities');
        break;
      case 'candidate-matcher':
        navigate('/admin/matcher');
        break;
      case 'simulation-studio':
        navigate('/admin/simulation');
        break;
      case 'donors-standby':
        navigate('/admin/donors');
        break;
      case 'appointments':
        navigate('/admin/appointments');
        break;
    }
  };

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [m, invRaw, dem, reqs] = await Promise.all([
        getMetrics(),
        getInventorySummary('RBC'),
        getDemandTrend(),
        getEmergencyRequests(),
      ]);
      setMetrics(m);

      // Map API summary to widget distribution data
      const GROUP_COLORS: Record<string, string> = {
        'O+': '#0F766E', 'O-': '#C62828', 'A+': '#1565C0', 'A-': '#6A1B9A',
        'B+': '#EF6C00', 'B-': '#00838F', 'AB+': '#2E7D32', 'AB-': '#AD1457',
      };
      const totalUnits = invRaw.reduce((acc, curr) => acc + curr.total_usable_units, 0);
      const mappedInv = invRaw.map((item) => ({
        group: item.blood_group as any,
        units: item.total_usable_units,
        percentage: totalUnits > 0 ? Math.round((item.total_usable_units / totalUnits) * 1000) / 10 : 0,
        color: GROUP_COLORS[item.blood_group] || (item.status === 'CRITICAL' ? '#C62828' : '#0F766E'),
        usableUnits: item.total_usable_units,
      }));
      setInventoryDistribution(mappedInv);

      setDemandData(dem);
      setRequests(reqs);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async (newReq: BloodRequestCreate) => {
    try {
      const created = await createEmergencyRequest(newReq);
      setRequests((prev) => [created, ...prev]);
      setMetrics((prev) =>
        prev.map((m) =>
          m.id === 'critical-requests'
            ? { ...m, value: `${parseInt(String(m.value), 10) + 1}` }
            : m
        )
      );
    } catch (err) {
      console.error('Failed to create emergency request', err);
    }
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onNewRequest={() => setIsNewRequestOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        criticalCount={requests.filter((r) => r.urgency === 'CRITICAL').length}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
        onSwitchRole={(newRole) => {
          switchRole(newRole);
          navigate(newRole === 'patient' ? '/patient' : '/verifier');
        }}
      >
        {activeTab === 'command-center' && (
          <CommandCenter
            variant="overview"
            metrics={metrics}
            inventoryDistribution={inventoryDistribution}
            demandData={demandData}
            requests={requests}
            onSelectRequest={setSelectedRequest}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={loadData}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'emergency-requests' && (
          <CommandCenter
            variant="queue"
            metrics={metrics}
            inventoryDistribution={inventoryDistribution}
            demandData={demandData}
            requests={requests}
            onSelectRequest={setSelectedRequest}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={loadData}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'inventory-reserves' && <InventoryView />}
        {(activeTab === 'route-dispatch' || activeTab === 'drone-telemetry') && <LogisticsView />}
        {activeTab === 'safety-audit' && <SafetyAuditView />}
        {activeTab === 'facility-registry' && <FacilityRegistryView />}

        {activeTab === 'simulation-studio' && <AdaptiveReplanView />}

        {activeTab === 'candidate-matcher' && <CandidateMatcherView />}
        {activeTab === 'appointments' && <AdminAppointmentsView />}

        {/* Remaining placeholders */}
        {activeTab === 'donors-standby' && (
          <div className="bg-white rounded-3xl p-12 text-center border border-shell-border shadow-card">
            <h3 className="text-lg font-bold text-ink-primary capitalize">
              donors standby Subsystem
            </h3>
            <p className="text-xs text-ink-secondary mt-1">
              Deterministic multi-factor calculation engine running live in background across 13 Delhi NCR nodes.
            </p>
          </div>
        )}
      </AppShell>

      {/* New Emergency Request Modal with Live Plan Generator & 6-Point Gate */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSubmit={handleCreateRequest}
      />

      {/* Request Inspection Modal with Multi-Source Routing & Safety Audit */}
      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </>
  );
};
