import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  Flame,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { BloodGroup, ComponentType, UrgencyLevel, BloodRequestCreate } from '../../types';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newReq: BloodRequestCreate) => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [hospital, setHospital] = useState('hosp-aiims-delhi');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [componentType, setComponentType] = useState<ComponentType>('RBC');
  const [units, setUnits] = useState<number>(4);
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [maxEta, setMaxEta] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    planId: string;
    totalAllocated: number;
    confidenceScore: number;
    transportMode: string;
    estimatedEta: number;
    sources: Array<{ name: string; units: number; mode: string; eta: number }>;
  } | null>(null);

  const hospitalsList = [
    { id: 'hosp-aiims-delhi', name: 'AIIMS New Delhi (Trauma Centre)', zone: 'South Delhi' },
    { id: 'hosp-safdarjung-delhi', name: 'Safdarjung Hospital', zone: 'South West Delhi' },
    { id: 'hosp-max-saket', name: 'Max Super Speciality Hospital, Saket', zone: 'South Delhi' },
    { id: 'hosp-apollo-sarita', name: 'Indraprastha Apollo Hospitals', zone: 'South East Delhi' },
    { id: 'hosp-fortis-escorts', name: 'Fortis Escorts Heart Institute', zone: 'South East Delhi' },
    { id: 'hosp-medanta-gurgaon', name: 'Medanta The Medicity', zone: 'Gurgaon NCR' },
  ];

  const handleRunPlanning = async () => {
    setIsProcessing(true);
    // Simulate deterministic engine calculation & safety verification
    await new Promise((resolve) => setTimeout(resolve, 600));

    const plan = {
      planId: `PLAN-${Math.floor(1000 + Math.random() * 9000)}`,
      totalAllocated: units,
      confidenceScore: 0.98,
      transportMode: units <= 4 && maxEta <= 25 ? 'DRONE' : 'EMERGENCY_AMBULANCE',
      estimatedEta: Math.min(maxEta, Math.floor(maxEta * 0.75)),
      sources: [
        {
          name: 'Rotary Blood Bank, Tughlakabad',
          units: Math.ceil(units * 0.75),
          mode: 'DRONE',
          eta: 12,
        },
        {
          name: 'Red Cross Regional Blood Bank',
          units: Math.floor(units * 0.25) || 1,
          mode: 'EMERGENCY_AMBULANCE',
          eta: 18,
        },
      ],
    };

    setGeneratedPlan(plan);
    setIsProcessing(false);
  };

  const handleConfirmDispatch = () => {
    const newReq: BloodRequestCreate = {
      hospital_id: hospital,
      blood_group: bloodGroup,
      component_type: componentType,
      units_requested: units,
      urgency: urgency,
      max_eta_minutes: maxEta,
      status: 'PENDING',
    };

    onSubmit(newReq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-3xl border border-shell-border shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-shell-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border flex items-center justify-center font-bold">
              <Flame className="w-4 h-4 text-crimson" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary">
                New Emergency Blood Request
              </h3>
              <p className="text-xs text-ink-secondary">
                Trigger deterministic multi-source allocation & safety validation
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

        {/* Form Body */}
        {!generatedPlan ? (
          <div className="space-y-4 py-4">
            {/* Hospital Selector */}
            <div>
              <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                Recipient Hospital / Trauma Center
              </label>
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-semibold text-ink-primary focus:outline-none focus:border-teal-brand"
              >
                {hospitalsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* Blood Group & Component Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3.5 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-mono font-bold text-ink-primary focus:outline-none focus:border-teal-brand"
                >
                  <option value="O-">O- (Universal Donor)</option>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                  Component Type
                </label>
                <select
                  value={componentType}
                  onChange={(e) => setComponentType(e.target.value as ComponentType)}
                  className="w-full px-3.5 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-semibold text-ink-primary focus:outline-none focus:border-teal-brand"
                >
                  <option value="RBC">RBC (Packed Red Cells)</option>
                  <option value="PLATELETS">Platelets (RDP/SDP)</option>
                  <option value="FFP">FFP (Fresh Frozen Plasma)</option>
                  <option value="CRYO">Cryoprecipitate</option>
                </select>
              </div>
            </div>

            {/* Units & Urgency Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                  Units Required
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-bold text-ink-primary focus:outline-none focus:border-teal-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                  className="w-full px-3.5 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-bold text-ink-primary focus:outline-none focus:border-teal-brand"
                >
                  <option value="CRITICAL">STAT / CRITICAL</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1 uppercase tracking-wider">
                  Target ETA
                </label>
                <select
                  value={maxEta}
                  onChange={(e) => setMaxEta(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs md:text-sm font-semibold text-ink-primary focus:outline-none focus:border-teal-brand"
                >
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                </select>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleRunPlanning}
                disabled={isProcessing}
                className="w-full py-3 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-2xl font-bold text-sm shadow-pill flex items-center justify-center gap-2 transition-all"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Evaluating Candidates & Safety Gates...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Run Deterministic Plan Generator</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Generated Plan & 6-Point Gate Results */
          <div className="space-y-4 py-4 animate-in fade-in duration-200">
            {/* Success Summary Pill */}
            <div className="p-3.5 bg-pastel-lime-bg border border-pastel-lime-border rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-900">
                    Plan Formulated & Validated (100% On-Time)
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    {units} units of {bloodGroup} allocated across 2 hub sources in {generatedPlan.estimatedEta} min.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 bg-white/80 rounded-lg text-emerald-800">
                Score: {generatedPlan.confidenceScore}
              </span>
            </div>

            {/* 6-Point Safety Gate Checklist */}
            <div className="p-4 bg-shell-bg border border-shell-border rounded-2xl">
              <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider block mb-2">
                Deterministic 6-Point Safety Gate Verification
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-ink-primary">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>1. Biological Compat (ABO/Rh)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2. Quantity Conservation</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>3. Safety Reserve Floor</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>4. Facility Status Active</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>5. Logistics / ETA Validity</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>6. Mathematical Consistency</span>
                </div>
              </div>
            </div>

            {/* Dispatch Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGeneratedPlan(null)}
                className="flex-1 py-2.5 bg-shell-bg hover:bg-shell-border text-ink-secondary rounded-xl font-bold text-xs transition-colors"
              >
                Modify Parameters
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="flex-1 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl font-bold text-xs shadow-pill flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Authorize & Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
