import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { CommandCenter } from './pages/CommandCenter';
import { InventoryView } from './pages/InventoryView';
import { LogisticsView } from './pages/LogisticsView';
import { SafetyAuditView } from './pages/SafetyAuditView';
import { FacilityRegistryView } from './pages/FacilityRegistryView';
import { NewRequestModal } from './components/dashboard/NewRequestModal';
import { RequestDetailsModal } from './components/dashboard/RequestDetailsModal';
import {
  getMetrics,
  getInventorySummary,
  getDemandTrend,
  getEmergencyRequests,
  createEmergencyRequest,
} from './services/api';
import {
  NavItem,
  MetricCardData,
  InventoryGroupDistribution,
  DemandDayData,
  EmergencyRequest,
  BloodRequestCreate,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItem>('command-center');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);

  // Dashboard Data State
  const [metrics, setMetrics] = useState<MetricCardData[]>([]);
  const [inventoryDistribution, setInventoryDistribution] = useState<InventoryGroupDistribution[]>([]);
  const [demandData, setDemandData] = useState<DemandDayData[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

      // Map API summary to widget distribution data with distinct blood-group colors
      const GROUP_COLORS: Record<string, string> = {
        'O+': '#0F766E',
        'O-': '#C62828',
        'A+': '#1565C0',
        'A-': '#6A1B9A',
        'B+': '#EF6C00',
        'B-': '#00838F',
        'AB+': '#2E7D32',
        'AB-': '#AD1457',
      };
      const totalUnits = invRaw.reduce((acc, curr) => acc + curr.total_usable_units, 0);
      const mappedInv = invRaw.map(item => ({
        group: item.blood_group as any,
        units: item.total_usable_units,
        percentage: totalUnits > 0
          ? Math.round((item.total_usable_units / totalUnits) * 1000) / 10
          : 0,
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
    const created = await createEmergencyRequest(newReq);
    // @ts-ignore: mapping created response to EmergencyRequest
    setRequests((prev) => [created, ...prev]);
    // Increment active emergency demands count
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === 'critical-requests'
          ? { ...m, value: `${parseInt(String(m.value), 10) + 1}` }
          : m
      )
    );
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewRequest={() => setIsNewRequestOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        criticalCount={requests.filter((r) => r.urgency === 'CRITICAL').length}
      >
        {activeTab === 'command-center' && (
          <CommandCenter
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

        {/* Intelligence / Simulation / Standby View Placeholders */}
        {['candidate-matcher', 'simulation-studio', 'donors-standby'].includes(activeTab) && (
          <div className="bg-white rounded-3xl p-12 text-center border border-shell-border shadow-card">
            <h3 className="text-lg font-bold text-ink-primary capitalize">
              {activeTab.replace('-', ' ')} Subsystem
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

export default App;
