import React from 'react';
import {
  HeartPulse,
  PlusCircle,
  Clock,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Droplets,
  PhoneCall,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PatientOverviewProps {
  onGoToRequest: () => void;
  onGoToRequests: () => void;
  onTrackRequest: (id: string) => void;
}

export const PatientOverview: React.FC<PatientOverviewProps> = ({
  onGoToRequest,
  onGoToRequests,
  onTrackRequest,
}) => {
  const { user, patientRequests } = useAuth();

  const dispatchedCount = patientRequests.filter((r) => r.status === 'DISPATCHED').length;
  const totalUnits = patientRequests.reduce((sum, r) => sum + r.units_requested, 0);

  const latestRequest = patientRequests[0];

  return (
    <div className="space-y-6">
      {/* Reassuring Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
              Hello, {user?.name || 'Priya'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Patient Portal
            </span>
          </div>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Track your emergency blood requests, verify fulfillment progress, and find critical care resources.
          </p>
        </div>

        {/* Quick Request Button */}
        <button
          onClick={onGoToRequest}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-sm font-bold shadow-pill transition-all transform hover:scale-[1.01] active:scale-[0.99] self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Blood Request</span>
        </button>
      </div>

      {/* Emergency Immediate Action Notice */}
      <div className="p-4 bg-pastel-rose-bg border border-pastel-rose-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-crimson text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-pastel-rose-text">
              Emergency Guidance Notice
            </h2>
            <p className="text-xs text-pastel-rose-text/90 mt-0.5 leading-relaxed">
              RHEON AI assists registered trauma centers with logistics coordination. If a patient is suffering from acute trauma, massive hemorrhage, or an immediate life-threatening emergency, please notify the treating hospital emergency room immediately or contact local emergency dispatch (<strong>112 / 102</strong>).
            </p>
          </div>
        </div>
        <a
          href="tel:112"
          className="px-4 py-2 bg-crimson hover:bg-crimson-hover text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 shadow-sm transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call 112 STAT</span>
        </a>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Your Requests</span>
            <p className="text-2xl font-extrabold text-ink-primary mt-1">{patientRequests.length}</p>
            <span className="text-[11px] text-ink-secondary">Submitted this session</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-mint-bg text-pastel-mint-text flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">In Transit / Active</span>
            <p className="text-2xl font-extrabold text-teal-brand mt-1">{dispatchedCount}</p>
            <span className="text-[11px] text-emerald-700 font-medium">Real-time GPS monitored</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Navigation className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Units Requested</span>
            <p className="text-2xl font-extrabold text-ink-primary mt-1">{totalUnits}</p>
            <span className="text-[11px] text-ink-secondary">Blood & components</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-rose-bg text-pastel-rose-text flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Safety Verified</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">100%</p>
            <span className="text-[11px] text-emerald-700 font-medium">Deterministic 6-Point Gate</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-lime-bg text-pastel-lime-text flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Latest Active Request Banner or Empty State */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-brand" />
            <h2 className="text-base font-bold text-ink-primary">Your Most Recent Request</h2>
          </div>
          {patientRequests.length > 0 && (
            <button
              onClick={onGoToRequests}
              className="text-xs font-bold text-teal-brand hover:underline flex items-center gap-1"
            >
              <span>View all ({patientRequests.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {latestRequest ? (
          <div className="p-5 rounded-2xl bg-shell-bg border border-shell-border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="px-3 py-1.5 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-xl font-mono font-extrabold text-base">
                  {latestRequest.blood_group}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-ink-primary">
                      {latestRequest.hospital_name}
                    </h4>
                    <span className="text-xs font-mono font-bold text-ink-secondary bg-white px-2 py-0.5 rounded border border-shell-border">
                      {latestRequest.id}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">
                    Component: <strong className="text-ink-primary">{latestRequest.component_type}</strong> •{' '}
                    Units: <strong className="text-ink-primary">{latestRequest.units_requested}</strong> •{' '}
                    Logged: {latestRequest.created_at}
                  </p>
                  {latestRequest.clinical_notes && (
                    <p className="text-xs text-ink-secondary mt-1 italic">
                      "{latestRequest.clinical_notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 bg-white rounded-xl border border-shell-border text-center">
                  <span className="text-[10px] font-bold text-ink-secondary uppercase block">Status</span>
                  <span
                    className={`text-xs font-bold ${
                      latestRequest.status === 'DISPATCHED'
                        ? 'text-teal-brand'
                        : latestRequest.status === 'FULFILLED'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {latestRequest.status}
                  </span>
                </div>

                <div className="px-3 py-1.5 bg-white rounded-xl border border-shell-border text-center">
                  <span className="text-[10px] font-bold text-ink-secondary uppercase block">Est. Delivery</span>
                  <span className="text-xs font-bold text-teal-brand font-mono">
                    ~{latestRequest.actual_eta_mins || latestRequest.max_eta_minutes || 20} mins
                  </span>
                </div>

                <button
                  onClick={() => onTrackRequest(latestRequest.id)}
                  className="px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill flex items-center gap-1.5 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Track Progress</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-shell-bg/50 rounded-2xl border border-dashed border-shell-border">
            <HeartPulse className="w-10 h-10 text-ink-secondary/50 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-ink-primary">No Blood Requests Yet</h4>
            <p className="text-xs text-ink-secondary max-w-md mx-auto mt-1">
              You haven't submitted any emergency blood requests in this demo session. You can submit one now to see how RHEON AI coordinates blood across NCR hospitals.
            </p>
            <button
              onClick={onGoToRequest}
              className="mt-4 px-4 py-2 bg-teal-brand text-white rounded-xl text-xs font-bold shadow-pill hover:bg-teal-brand-hover transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create First Request</span>
            </button>
          </div>
        )}
      </div>

      {/* How RHEON Coordinates Blood - 4-step explanation */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-teal-brand" />
          <h2 className="text-base font-bold text-ink-primary">
            How Emergency Blood Logistics Operates
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-shell-bg border border-shell-border">
            <div className="w-8 h-8 rounded-full bg-teal-brand text-white font-bold text-xs flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="text-xs font-bold text-ink-primary">Request Logged</h4>
            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
              Hospital clinical staff or patient caregiver enters blood group, component, and time urgency.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-shell-bg border border-shell-border">
            <div className="w-8 h-8 rounded-full bg-teal-brand text-white font-bold text-xs flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="text-xs font-bold text-ink-primary">6-Point Safety Gate</h4>
            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
              Deterministic algorithm checks biological compatibility, stock preservation, and cold-chain validity.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-shell-bg border border-shell-border">
            <div className="w-8 h-8 rounded-full bg-teal-brand text-white font-bold text-xs flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="text-xs font-bold text-ink-primary">Multi-Source Dispatch</h4>
            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
              Nearest verified blood bank prepares tested units. Autonomous drone or siren ambulance dispatches.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-shell-bg border border-shell-border">
            <div className="w-8 h-8 rounded-full bg-teal-brand text-white font-bold text-xs flex items-center justify-center mb-3">
              4
            </div>
            <h4 className="text-xs font-bold text-ink-primary">Trauma Center Handover</h4>
            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
              Emergency room verifies barcode and temperature telemetry upon delivery for immediate infusion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
