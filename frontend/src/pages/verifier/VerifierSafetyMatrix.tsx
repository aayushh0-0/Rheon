import React, { useState } from 'react';
import {
  ShieldCheck,
  Droplets,
} from 'lucide-react';
import { BloodGroup } from '../../types';

export const VerifierSafetyMatrix: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O-');

  const rbcCompatibility: Record<BloodGroup, { canGiveTo: BloodGroup[]; canReceiveFrom: BloodGroup[]; note: string }> = {
    'O-': {
      canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-'],
      note: 'Universal RBC donor: Zero A/B/Rh(D) antigens on red cell surface.',
    },
    'O+': {
      canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
      canReceiveFrom: ['O-', 'O+'],
      note: 'Can donate RBCs to any Rh-positive recipient.',
    },
    'A-': {
      canGiveTo: ['A-', 'A+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-', 'A-'],
      note: 'A antigen present; Rh(D) negative.',
    },
    'A+': {
      canGiveTo: ['A+', 'AB+'],
      canReceiveFrom: ['O-', 'O+', 'A-', 'A+'],
      note: 'A antigen and Rh(D) present.',
    },
    'B-': {
      canGiveTo: ['B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-', 'B-'],
      note: 'B antigen present; Rh(D) negative.',
    },
    'B+': {
      canGiveTo: ['B+', 'AB+'],
      canReceiveFrom: ['O-', 'O+', 'B-', 'B+'],
      note: 'B antigen and Rh(D) present.',
    },
    'AB-': {
      canGiveTo: ['AB-', 'AB+'],
      canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'],
      note: 'A and B antigens present; Rh(D) negative.',
    },
    'AB+': {
      canGiveTo: ['AB+'],
      canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      note: 'Universal RBC recipient: Can receive red cells from all blood groups.',
    },
  };

  const safetyGates = [
    {
      step: 1,
      name: 'Biological Compatibility (ABO / Rh)',
      type: 'Deterministic Strict Matrix',
      description: 'Validates antigen/antibody compatibility across RBC, FFP, Platelets, and Cryoprecipitate. Zero heuristic tolerance.',
      status: 'VERIFIED',
    },
    {
      step: 2,
      name: 'Quantity Conservation Exactness',
      type: 'Mathematical Invariant',
      description: 'Guarantees sum(Allocated) + Unmet == Requested. Prevents over-dispatch or unit duplication.',
      status: 'VERIFIED',
    },
    {
      step: 3,
      name: 'Safety Reserve Floor Protection',
      type: 'Statutory Safeguard',
      description: 'Enforces Usable Stock = max(0, Available - SafetyReserve). Never breaches statutory emergency reserves.',
      status: 'VERIFIED',
    },
    {
      step: 4,
      name: 'Source Facility Operational Verification',
      type: 'Live Status Check',
      description: 'Ensures supplying hub is online, active, and verified with valid cold-storage telemetry.',
      status: 'VERIFIED',
    },
    {
      step: 5,
      name: 'Logistics Route & Flight Corridor Validity',
      type: 'Geospatial Clearance',
      description: 'Confirms positive distance/ETA, drone corridor green-flagging, and ambulance green-corridor availability.',
      status: 'VERIFIED',
    },
    {
      step: 6,
      name: 'Mathematical Consistency & Positivity',
      type: 'Allocation Bound Audit',
      description: 'Requires all assigned unit quantities to be non-zero integers within physical transport bounds.',
      status: 'VERIFIED',
    },
  ];

  const current = rbcCompatibility[selectedGroup];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
          Safety Gate & Immunohematology Matrix
        </h2>
        <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
          Deterministic biological rules and mathematical invariants enforced across all emergency dispatches.
        </p>
      </div>

      {/* Interactive ABO/Rh Matrix Explorer */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-5 h-5 text-crimson" />
          <h3 className="text-sm sm:text-base font-bold text-ink-primary">
            Interactive RBC Compatibility Explorer
          </h3>
        </div>

        {/* Group Selector */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
          {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
            <button
              key={bg}
              onClick={() => setSelectedGroup(bg)}
              className={`py-2 rounded-xl font-mono font-bold text-xs sm:text-sm transition-all ${
                selectedGroup === bg
                  ? 'bg-teal-brand text-white shadow-pill ring-2 ring-teal-brand/20'
                  : 'bg-shell-bg text-ink-primary hover:bg-shell-card-subtle border border-shell-border'
              }`}
            >
              {bg}
            </button>
          ))}
        </div>

        {/* Selected Group Breakdown */}
        <div className="p-5 rounded-2xl bg-shell-bg border border-shell-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-shell-border">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-xl font-mono font-extrabold text-lg">
                {selectedGroup}
              </span>
              <div>
                <h4 className="text-sm font-bold text-ink-primary">Blood Group {selectedGroup} RBC Profile</h4>
                <p className="text-xs text-ink-secondary">{current.note}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-white rounded-xl border border-shell-border">
              <span className="text-[11px] font-bold text-ink-secondary uppercase block mb-2">
                Can Safely Donate RBCs To:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {current.canGiveTo.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-mono font-bold"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-shell-border">
              <span className="text-[11px] font-bold text-ink-secondary uppercase block mb-2">
                Can Safely Receive RBCs From:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {current.canReceiveFrom.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-mono font-bold"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Point Gate Invariant Specifications */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm sm:text-base font-bold text-ink-primary">
              Deterministic 6-Point Safety Invariant Engine
            </h3>
          </div>
          <span className="text-xs font-bold bg-pastel-lime-bg text-emerald-800 px-3 py-1 rounded-full border border-pastel-lime-border">
            Zero LLM Tolerance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyGates.map((gate) => (
            <div
              key={gate.step}
              className="p-4 rounded-2xl bg-shell-bg/70 border border-shell-border flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-teal-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {gate.step}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-ink-primary">{gate.name}</h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-shell-border">
                    VERIFIED
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-teal-brand block mt-0.5">
                  {gate.type}
                </span>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                  {gate.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
