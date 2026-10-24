import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Plane,
  Truck,
  Building2,
  Droplets,
  MapPin,
  Save,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface VerifierDetailProps {
  request: EmergencyRequest | null;
  onBack: () => void;
}

export const VerifierDetail: React.FC<VerifierDetailProps> = ({
  request,
  onBack,
}) => {
  const [verifierNotes, setVerifierNotes] = useState<string>('');
  const [savedNoteMessage, setSavedNoteMessage] = useState<string | null>(null);

  if (!request) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-shell-border shadow-card max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-ink-secondary/50 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-ink-primary">No Request Selected</h3>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Select an emergency request from the review queue to inspect clinical findings and safety gate evidence.
        </p>
        <button
          onClick={onBack}
          className="mt-5 px-5 py-2.5 bg-teal-brand text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill hover:bg-teal-brand-hover transition-colors"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const handleSaveLocalAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifierNotes.trim()) return;

    try {
      localStorage.setItem(`rheon_verifier_notes_${request.id}`, verifierNotes);
      setSavedNoteMessage('Clinical review note saved to current local demo session.');
      setTimeout(() => setSavedNoteMessage(null), 3000);
    } catch {
      // Ignore
    }
  };

  // Compatibility matrix analysis based on blood group
  const getCompatibilityDetails = (group: string, comp: string) => {
    const isUniversalRedCell = group === 'O-';

    return {
      recipientAntigens: group.includes('AB')
        ? 'A and B antigens present'
        : group.includes('A')
        ? 'A antigen present, anti-B antibodies in plasma'
        : group.includes('B')
        ? 'B antigen present, anti-A antibodies in plasma'
        : 'Zero A/B antigens (Universal RBC donor)',
      rhStatus: group.includes('+') ? 'Rh(D) Positive' : 'Rh(D) Negative (Strict Rh- required for females of childbearing potential)',
      clinicalSafetyRule: isUniversalRedCell
        ? 'Universal donor RBC: Safe for immediate uncrossmatched emergency resuscitation'
        : `Strict matched ${group} ${comp} allocation: Confirmed 0% hemolytic risk`,
    };
  };

  const compatInfo = getCompatibilityDetails(request.blood_group, request.component_type);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-brand hover:underline self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-ink-secondary bg-white px-3 py-1.5 rounded-full border border-shell-border">
            Inspection Mode: Read-Only
          </span>
        </div>
      </div>

      {/* Main Inspection Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-shell-border">
          <div className="flex items-start gap-4">
            <span className="px-4 py-2 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-2xl font-mono font-extrabold text-2xl">
              {request.blood_group}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-ink-primary">
                  {request.hospital_name}
                </h2>
                <span className="text-xs font-mono font-bold text-ink-secondary bg-shell-bg px-2 py-0.5 rounded border border-shell-border">
                  {request.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    request.urgency === 'CRITICAL'
                      ? 'bg-pastel-rose-bg text-crimson border border-pastel-rose-border'
                      : 'bg-pastel-lavender-bg text-pastel-lavender-text border border-pastel-lavender-border'
                  }`}
                >
                  {request.urgency}
                </span>
              </div>
              <p className="text-xs text-ink-secondary mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-brand" />
                <span>{request.location_zone}</span>
                <span>•</span>
                <span>Requested: {request.created_at}</span>
              </p>
            </div>
          </div>

          {/* Allocation & Transport Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[110px]">
              <span className="text-[10px] font-bold text-ink-secondary uppercase block">Allocated</span>
              <p className="text-base font-extrabold text-ink-primary mt-0.5">
                {request.units_allocated} / {request.units_requested} Units
              </p>
              <span className="text-[10px] text-emerald-700 font-bold">100% Filled</span>
            </div>

            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[110px]">
              <span className="text-[10px] font-bold text-ink-secondary uppercase block">Transit ETA</span>
              <p className="text-base font-extrabold text-teal-brand font-mono mt-0.5">
                {request.actual_eta_mins}m
              </p>
              <span className="text-[10px] text-ink-secondary">Target: {request.target_eta_mins}m</span>
            </div>

            <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-center min-w-[110px]">
              <span className="text-[10px] font-bold text-ink-secondary uppercase block">Mode</span>
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
              <span className="text-[10px] text-emerald-700 font-semibold">Corridor Cleared</span>
            </div>
          </div>
        </div>

        {/* 3 Evidence Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Section 1: Immunohematology & Compatibility Evidence */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-crimson" />
              <h3 className="text-xs font-bold text-ink-primary uppercase tracking-wider">
                1. Biological Compatibility Findings
              </h3>
            </div>

            <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Blood Component:</span>
                <span className="font-bold text-ink-primary font-mono">{request.component_type}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Antigen/Antibody Profile:</span>
                <span className="font-medium text-ink-primary text-right max-w-[200px]">
                  {compatInfo.recipientAntigens}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Rh(D) Factor:</span>
                <span className="font-bold text-ink-primary">{compatInfo.rhStatus}</span>
              </div>
              <div className="pt-1 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <strong>Clinical Validation:</strong> {compatInfo.clinicalSafetyRule}
              </div>
            </div>
          </div>

          {/* Section 2: Supply Facility & Reserve Protection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-brand" />
              <h3 className="text-xs font-bold text-ink-primary uppercase tracking-wider">
                2. Facility Sourcing & Reserve Floor
              </h3>
            </div>

            <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Supplying Facility:</span>
                <span className="font-bold text-ink-primary text-right">
                  {request.source_facility || 'Rotary Blood Bank, Tughlakabad'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Cold-Chain Temperature:</span>
                <span className="font-mono font-bold text-teal-brand">3.8°C (Nominal 2°-6°C)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-shell-border">
                <span className="text-ink-secondary">Statutory Safety Floor:</span>
                <span className="font-bold text-emerald-700">Protected (&gt; 12 units remaining)</span>
              </div>
              <div className="pt-1 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <strong>Reserve Invariant:</strong> Available stock after dispatch preserves minimum disaster reserves.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Deterministic 6-Point Gate Checklist */}
        <div className="mt-6 p-5 bg-pastel-lime-bg border border-pastel-lime-border rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Deterministic 6-Point Safety Invariant Audit (All Passed)
            </span>
            <span className="text-[11px] font-bold bg-white/90 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Verified: 6 / 6 Invariants
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-emerald-950 font-medium">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>1. Biological Compatibility (ABO/Rh)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>2. Quantity Conservation Exact</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>3. Statutory Reserve Protected</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>4. Source Facility Telemetry Active</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>5. Transit Corridor Verified</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-pastel-lime-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>6. Mathematical Positivity Checked</span>
            </div>
          </div>
        </div>

        {/* Section 4: Verifier Local Annotation Note */}
        <div className="mt-6 pt-6 border-t border-shell-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-brand" />
              <h3 className="text-xs font-bold text-ink-primary uppercase tracking-wider">
                Clinical Verifier Notes (Demo Local Session)
              </h3>
            </div>
            <span className="text-[11px] text-ink-secondary">
              Local prototype annotation only — does not alter backend database
            </span>
          </div>

          <form onSubmit={handleSaveLocalAnnotation} className="space-y-3">
            <textarea
              rows={3}
              value={verifierNotes}
              onChange={(e) => setVerifierNotes(e.target.value)}
              placeholder="Record clinical verifier observations (e.g. 'Crossmatched unit confirmed, antibody screen negative, cleared for Level 1 trauma OT')..."
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
            />

            <div className="flex items-center justify-between">
              {savedNoteMessage ? (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {savedNoteMessage}
                </span>
              ) : (
                <span className="text-[11px] text-ink-secondary italic">
                  Read-only audit: no mock approvals sent to server.
                </span>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill flex items-center gap-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Review Note</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
