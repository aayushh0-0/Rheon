import React from 'react';
import {
  Navigation,
  Clock,
  Plane,
  Truck,
  Building2,
  Thermometer,
  MapPin,
  PhoneCall,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PatientEmergencyRequest } from '../../types/auth';

interface PatientTrackingViewProps {
  requestId?: string | null;
  onGoToRequests: () => void;
  onNewRequest: () => void;
}

export const PatientTrackingView: React.FC<PatientTrackingViewProps> = ({
  requestId,
  onGoToRequests,
  onNewRequest,
}) => {
  const { patientRequests } = useAuth();

  // Find requested or default to first request
  const request: PatientEmergencyRequest | undefined = requestId
    ? patientRequests.find((r) => r.id === requestId)
    : patientRequests[0];

  if (!request) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-shell-border shadow-card max-w-lg mx-auto">
        <Navigation className="w-12 h-12 text-ink-secondary/40 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-ink-primary">No Active Request to Track</h3>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          You don't have any requests currently in tracking. Create an emergency blood request to view live dispatch milestones.
        </p>
        <button
          onClick={onNewRequest}
          className="mt-5 px-5 py-2.5 bg-teal-brand text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill hover:bg-teal-brand-hover transition-colors"
        >
          Create Blood Request
        </button>
      </div>
    );
  }

  const isFulfilled = request.status === 'FULFILLED';

  const milestones = [
    {
      title: 'Emergency Request Logged',
      time: request.created_at,
      status: 'COMPLETE',
      desc: 'Requirements validated against registered NCR trauma protocols.',
    },
    {
      title: 'Deterministic Safety Gate Cleared',
      time: '1 min later',
      status: 'COMPLETE',
      desc: '6/6 mathematical checks passed: ABO/Rh matrix and reserve floor protected.',
    },
    {
      title: 'Cold-Chain Units Sourced',
      time: '3 mins later',
      status: 'COMPLETE',
      desc: `Units secured at ${request.source_facility || 'Rotary Central Blood Bank'}.`,
    },
    {
      title: isFulfilled ? 'Delivered to Trauma OT' : 'En Route to Receiving Hospital',
      time: isFulfilled ? 'Delivered' : `ETA ~${request.actual_eta_mins || 15} mins`,
      status: isFulfilled ? 'COMPLETE' : 'ACTIVE',
      desc:
        request.transport_mode === 'DRONE'
          ? 'Autonomous drone STAT flight corridor green-flagged.'
          : 'Emergency siren cold-chain ambulance en route.',
    },
    {
      title: 'Final Bedside Handover',
      time: isFulfilled ? 'Completed' : 'Pending Delivery',
      status: isFulfilled ? 'COMPLETE' : 'PENDING',
      desc: 'Barcode cross-check and medical staff sign-off.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
              Emergency Dispatch Tracking
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-shell-bg text-ink-primary border border-shell-border">
              {request.id}
            </span>
          </div>
          <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
            Real-time fulfillment telemetry for <strong className="text-ink-primary">{request.hospital_name}</strong>
          </p>
        </div>

        <button
          onClick={onGoToRequests}
          className="text-xs font-bold text-teal-brand hover:underline self-start sm:self-auto"
        >
          View all requests
        </button>
      </div>

      {/* Main Status & Telemetry Card */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-shell-border">
          <div className="flex items-start gap-4">
            <span className="px-4 py-2 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-2xl font-mono font-extrabold text-xl">
              {request.blood_group}
            </span>
            <div>
              <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">
                Emergency Consignment
              </span>
              <h3 className="text-base sm:text-lg font-bold text-ink-primary">
                {request.units_requested} Units {request.component_type}
              </h3>
              <p className="text-xs text-ink-secondary mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-brand" />
                <span>Destination: {request.hospital_name}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Live Temperature Monitor */}
            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[120px]">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-ink-secondary">
                <Thermometer className="w-3.5 h-3.5 text-teal-brand" />
                <span>Cold Chain</span>
              </div>
              <p className="text-base font-extrabold text-teal-brand font-mono mt-0.5">
                3.8°C
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                Optimal (2°-6°)
              </span>
            </div>

            {/* Logistics ETA countdown */}
            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[120px]">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-ink-secondary">
                <Clock className="w-3.5 h-3.5 text-teal-brand" />
                <span>Estimated ETA</span>
              </div>
              <p className="text-base font-extrabold text-ink-primary font-mono mt-0.5">
                {isFulfilled ? 'Delivered' : `~${request.actual_eta_mins || 15} Mins`}
              </p>
              <span className="text-[10px] text-ink-secondary">
                Target: {request.max_eta_minutes}m
              </span>
            </div>

            {/* Transport mode */}
            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[120px]">
              <span className="text-[10px] font-bold text-ink-secondary uppercase block">
                Transport Mode
              </span>
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-ink-primary mt-1">
                {request.transport_mode === 'DRONE' ? (
                  <>
                    <Plane className="w-4 h-4 text-teal-brand" />
                    <span>Drone STAT</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 text-teal-brand" />
                    <span>Ambulance</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">Priority Corridor</span>
            </div>
          </div>
        </div>

        {/* Milestone Progression */}
        <div className="pt-6">
          <h4 className="text-xs font-bold text-ink-primary uppercase tracking-wider mb-5">
            Logistics & Verification Milestones
          </h4>
          <div className="space-y-4">
            {milestones.map((m, index) => {
              const isDone = m.status === 'COMPLETE';
              const isActive = m.status === 'ACTIVE';

              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-teal-brand text-white ring-4 ring-teal-brand/20 animate-pulse'
                          : 'bg-shell-border text-ink-secondary'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </div>
                    {index < milestones.length - 1 && (
                      <div
                        className={`w-0.5 h-10 my-1 ${
                          isDone ? 'bg-emerald-500' : 'bg-shell-border'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <h5
                        className={`text-xs sm:text-sm font-bold ${
                          isActive
                            ? 'text-teal-brand'
                            : isDone
                            ? 'text-ink-primary'
                            : 'text-ink-secondary'
                        }`}
                      >
                        {m.title}
                      </h5>
                      <span className="text-[11px] font-mono font-medium text-ink-secondary">
                        {m.time}
                      </span>
                    </div>
                    <p className="text-xs text-ink-secondary mt-0.5">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hospital Help Card */}
      <div className="p-4 bg-white rounded-2xl border border-shell-border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-ink-primary">
              Hospital Emergency Desk
            </h4>
            <p className="text-xs text-ink-secondary">
              Contact receiving hospital trauma desk directly for immediate patient updates.
            </p>
          </div>
        </div>

        <a
          href="tel:+911126588500"
          className="px-4 py-2 bg-shell-bg hover:bg-shell-card-subtle border border-shell-border text-ink-primary rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5 text-teal-brand" />
          <span>Call Hospital Desk</span>
        </a>
      </div>
    </div>
  );
};
