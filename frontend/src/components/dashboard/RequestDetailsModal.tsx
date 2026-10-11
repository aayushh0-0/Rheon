import React from 'react';
import {
  X,
  ShieldCheck,
  Plane,
  Truck,
  MapPin,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface RequestDetailsModalProps {
  request: EmergencyRequest | null;
  onClose: () => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  onClose,
}) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-shell-border shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-shell-border">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-xl font-mono font-extrabold text-sm">
              {request.blood_group}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink-primary">
                  {request.hospital_name}
                </h3>
                <span className="text-xs font-mono font-bold text-ink-secondary bg-shell-bg px-2 py-0.5 rounded">
                  {request.id}
                </span>
              </div>
              <p className="text-xs text-ink-secondary flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-teal-brand" />
                {request.location_zone} • Requested {request.created_at}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-shell-bg rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Key Allocation Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center">
              <span className="text-[10px] font-bold text-ink-secondary uppercase">
                Units Allocated
              </span>
              <p className="text-base font-extrabold text-ink-primary mt-0.5">
                {request.units_allocated} / {request.units_requested} Units
              </p>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                100% Fulfilled
              </span>
            </div>

            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center">
              <span className="text-[10px] font-bold text-ink-secondary uppercase">
                Logistics ETA
              </span>
              <p className="text-base font-extrabold text-teal-brand mt-0.5">
                {request.actual_eta_mins} min
              </p>
              <span className="text-[10px] font-medium text-ink-secondary">
                Target: {request.target_eta_mins}m
              </span>
            </div>

            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center">
              <span className="text-[10px] font-bold text-ink-secondary uppercase">
                Transport Mode
              </span>
              <p className="text-base font-extrabold text-ink-primary mt-0.5 flex items-center justify-center gap-1">
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
              </p>
              <span className="text-[10px] font-bold text-teal-brand bg-teal-50 px-1.5 py-0.2 rounded-full">
                Cold Chain Protected
              </span>
            </div>
          </div>

          {/* Sourcing Hubs */}
          <div className="p-4 bg-white border border-shell-border rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-ink-primary block mb-2">
              Multi-Source Facility Routing
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-shell-bg">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-brand" />
                  <div>
                    <span className="font-bold text-ink-primary">
                      {request.source_facility}
                    </span>
                    <span className="block text-[11px] text-ink-secondary">
                      Supplying {request.units_allocated} units {request.blood_group} {request.component_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-teal-brand">
                    {request.actual_eta_mins} min ETA
                  </span>
                  <span className="block text-[10px] text-emerald-700 font-semibold">
                    Reserve Intact
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6-Point Deterministic Safety Gate Audit */}
          <div className="p-4 bg-pastel-lime-bg border border-pastel-lime-border rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Deterministic 6-Point Safety Gate Verification (Passed)
              </span>
              <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded text-emerald-800">
                Audit Pass: 6/6
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>1. Biological Compatibility (ABO/Rh)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>2. Quantity Conservation Exact</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>3. Safety Reserve Floor Preserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>4. Source Hub Verified Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>5. Logistics Route & Mode Valid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>6. Positive Allocation Values</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-shell-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-brand text-white hover:bg-teal-brand-hover rounded-xl text-xs font-bold transition-all shadow-pill"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
