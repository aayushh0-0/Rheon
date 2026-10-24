import React, { useState, useEffect } from 'react';
import { PatientShell, PatientTab } from './PatientShell';
import { PatientOverview } from './PatientOverview';
import { PatientRequestForm } from './PatientRequestForm';
import { PatientRequestList } from './PatientRequestList';
import { PatientTrackingView } from './PatientTrackingView';
import { PatientGuidanceView } from './PatientGuidanceView';
import { useRouter } from '../../context/RouterContext';

export const PatientPortal: React.FC = () => {
  const { path, navigate, matchRoute } = useRouter();

  // Determine active tab from URL path
  const getTabFromPath = (): PatientTab => {
    if (path.includes('/patient/requests')) return 'requests';
    if (path.includes('/patient/track') || path.includes('/patient/tracking')) return 'tracking';
    if (path.includes('/patient/request')) return 'request';
    if (path.includes('/patient/guidance') || path.includes('/patient/help')) return 'guidance';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<PatientTab>(getTabFromPath);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(() => {
    const trackMatch = matchRoute('/patient/track/:id');
    return trackMatch.matched ? trackMatch.params.id : null;
  });

  // Keep activeTab in sync with path changes
  useEffect(() => {
    const tab = getTabFromPath();
    setActiveTab(tab);

    const trackMatch = matchRoute('/patient/track/:id');
    if (trackMatch.matched) {
      setSelectedTrackingId(trackMatch.params.id);
    }
  }, [path, matchRoute]);

  const handleSelectTab = (tab: PatientTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'overview':
        navigate('/patient');
        break;
      case 'request':
        navigate('/patient/request');
        break;
      case 'requests':
        navigate('/patient/requests');
        break;
      case 'tracking':
        if (selectedTrackingId) {
          navigate(`/patient/track/${selectedTrackingId}`);
        } else {
          navigate('/patient/track');
        }
        break;
      case 'guidance':
        navigate('/patient/guidance');
        break;
    }
  };

  const handleTrackRequest = (id: string) => {
    setSelectedTrackingId(id);
    setActiveTab('tracking');
    navigate(`/patient/track/${id}`);
  };

  return (
    <PatientShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      selectedTrackingId={selectedTrackingId}
    >
      {activeTab === 'overview' && (
        <PatientOverview
          onGoToRequest={() => handleSelectTab('request')}
          onGoToRequests={() => handleSelectTab('requests')}
          onTrackRequest={handleTrackRequest}
        />
      )}

      {activeTab === 'request' && (
        <PatientRequestForm
          onSuccess={(id) => handleTrackRequest(id)}
          onCancel={() => handleSelectTab('overview')}
        />
      )}

      {activeTab === 'requests' && (
        <PatientRequestList
          onTrackRequest={handleTrackRequest}
          onNewRequest={() => handleSelectTab('request')}
        />
      )}

      {activeTab === 'tracking' && (
        <PatientTrackingView
          requestId={selectedTrackingId}
          onGoToRequests={() => handleSelectTab('requests')}
          onNewRequest={() => handleSelectTab('request')}
        />
      )}

      {activeTab === 'guidance' && <PatientGuidanceView />}
    </PatientShell>
  );
};
