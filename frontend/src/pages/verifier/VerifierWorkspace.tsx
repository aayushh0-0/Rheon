import React, { useState, useEffect, useCallback } from 'react';
import { VerifierShell, VerifierTab } from './VerifierShell';
import { VerifierOverview } from './VerifierOverview';
import { VerifierQueue } from './VerifierQueue';
import { VerifierDetail } from './VerifierDetail';
import { VerifierSafetyMatrix } from './VerifierSafetyMatrix';
import { VerifierHistory } from './VerifierHistory';
import { getEmergencyRequests } from '../../services/api';
import { EmergencyRequest } from '../../types';
import { useRouter } from '../../context/RouterContext';

export const VerifierWorkspace: React.FC = () => {
  const { path, navigate, matchRoute } = useRouter();

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);

  // Sync tab with URL path
  const getTabFromPath = (): VerifierTab => {
    if (path.includes('/verifier/requests/') || path.includes('/verifier/detail')) return 'detail';
    if (path.includes('/verifier/requests') || path.includes('/verifier/queue')) return 'queue';
    if (path.includes('/verifier/safety') || path.includes('/verifier/matrix')) return 'safety';
    if (path.includes('/verifier/history') || path.includes('/verifier/audit')) return 'history';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<VerifierTab>(getTabFromPath);

  // Load real API requests
  const loadRequests = useCallback(async () => {
    try {
      const data = await getEmergencyRequests();
      setRequests(data);

      // Check if URL has a specific request ID
      const match = matchRoute('/verifier/requests/:id');
      if (match.matched) {
        const found = data.find((r) => r.id === match.params.id);
        if (found) {
          setSelectedRequest(found);
        }
      }
    } catch (err) {
      console.error('Failed to load requests for verifier workspace:', err);
    }
  }, [matchRoute]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const tab = getTabFromPath();
    setActiveTab(tab);

    const match = matchRoute('/verifier/requests/:id');
    if (match.matched && requests.length > 0) {
      const found = requests.find((r) => r.id === match.params.id);
      if (found) setSelectedRequest(found);
    }
  }, [path, requests, matchRoute]);

  const handleSelectTab = (tab: VerifierTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'overview':
        navigate('/verifier');
        break;
      case 'queue':
        navigate('/verifier/requests');
        break;
      case 'detail':
        if (selectedRequest) {
          navigate(`/verifier/requests/${selectedRequest.id}`);
        } else {
          navigate('/verifier/detail');
        }
        break;
      case 'safety':
        navigate('/verifier/safety');
        break;
      case 'history':
        navigate('/verifier/history');
        break;
    }
  };

  const handleInspectRequest = (req: EmergencyRequest) => {
    setSelectedRequest(req);
    setActiveTab('detail');
    navigate(`/verifier/requests/${req.id}`);
  };

  return (
    <VerifierShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      pendingCount={requests.filter((r) => r.urgency === 'CRITICAL').length}
    >
      {activeTab === 'overview' && (
        <VerifierOverview
          requests={requests}
          onSelectRequest={handleInspectRequest}
          onGoToQueue={() => handleSelectTab('queue')}
          onGoToSafety={() => handleSelectTab('safety')}
        />
      )}

      {activeTab === 'queue' && (
        <VerifierQueue
          requests={requests}
          onSelectRequest={handleInspectRequest}
        />
      )}

      {activeTab === 'detail' && (
        <VerifierDetail
          request={selectedRequest}
          onBack={() => handleSelectTab('queue')}
        />
      )}

      {activeTab === 'safety' && <VerifierSafetyMatrix />}

      {activeTab === 'history' && (
        <VerifierHistory
          requests={requests}
          onSelectRequest={handleInspectRequest}
        />
      )}
    </VerifierShell>
  );
};
