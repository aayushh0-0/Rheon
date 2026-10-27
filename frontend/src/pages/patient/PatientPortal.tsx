import React, { useState, useEffect } from 'react';
import { PatientShell, PatientTab } from './PatientShell';
import { PatientOverview } from './PatientOverview';
import { UploadReportView } from './UploadReportView';
import { ReportAnalysisView } from './ReportAnalysisView';
import { HealthTrends } from './HealthTrends';
import { MedicalHistory } from './MedicalHistory';
import { DownloadableReportsView } from './DownloadableReportsView';
import { PatientRequestForm } from './PatientRequestForm';
import { PatientRequestList } from './PatientRequestList';
import { PatientTrackingView } from './PatientTrackingView';
import { PatientDonorsView } from './PatientDonorsView';
import { PatientGuidanceView } from './PatientGuidanceView';
import { PatientAppointmentView } from './PatientAppointmentView';
import { useRouter } from '../../context/RouterContext';

export const PatientPortal: React.FC = () => {
  const { path, navigate, matchRoute } = useRouter();

  // Determine active tab from URL path
  const getTabFromPath = (): PatientTab => {
    if (path.includes('/patient/upload')) return 'upload';
    if (path.includes('/patient/analysis')) return 'analysis';
    if (path.includes('/patient/trends')) return 'trends';
    if (path.includes('/patient/history')) return 'history';
    if (path.includes('/patient/pdf')) return 'pdf';
    if (path.includes('/patient/requests')) return 'requests';
    if (path.includes('/patient/track') || path.includes('/patient/tracking')) return 'tracking';
    if (path.includes('/patient/donors')) return 'donors';
    if (path.includes('/patient/request')) return 'request';
    if (path.includes('/patient/guidance') || path.includes('/patient/help')) return 'guidance';
    if (path.includes('/patient/appointment')) return 'appointment';
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
      case 'upload':
        navigate('/patient/upload');
        break;
      case 'analysis':
        navigate('/patient/analysis');
        break;
      case 'trends':
        navigate('/patient/trends');
        break;
      case 'history':
        navigate('/patient/history');
        break;
      case 'pdf':
        navigate('/patient/pdf');
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
      case 'donors':
        navigate('/patient/donors');
        break;
      case 'guidance':
        navigate('/patient/guidance');
        break;
      case 'appointment':
        navigate('/patient/appointment');
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

      {activeTab === 'upload' && (
        <UploadReportView
          onSuccess={() => handleSelectTab('analysis')}
          onCancel={() => handleSelectTab('overview')}
        />
      )}

      {activeTab === 'analysis' && (
        <ReportAnalysisView onBack={() => handleSelectTab('overview')} />
      )}

      {activeTab === 'trends' && (
        <HealthTrends
          onBack={() => handleSelectTab('overview')}
          onNavigateTab={handleSelectTab}
        />
      )}

      {activeTab === 'history' && (
        <MedicalHistory onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'pdf' && (
        <DownloadableReportsView onBack={() => handleSelectTab('overview')} />
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

      {activeTab === 'donors' && <PatientDonorsView />}

      {activeTab === 'guidance' && <PatientGuidanceView />}

      {activeTab === 'appointment' && (
        <PatientAppointmentView onCancel={() => handleSelectTab('overview')} />
      )}
    </PatientShell>
  );
};
