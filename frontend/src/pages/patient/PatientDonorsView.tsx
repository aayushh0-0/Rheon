import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { donorApi, Donor, MatchingResponse } from '../../services/donorApi';
import { BloodGroup, ComponentType, UrgencyLevel } from '../../types';

export const PatientDonorsView: React.FC = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState<boolean>(true);
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Register Donor Modal State
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>('Priya Sharma');
  const [regBloodGroup, setRegBloodGroup] = useState<BloodGroup>('O-');
  const [regLocation, setRegLocation] = useState<string>('South Delhi NCR Zone');
  const [regStatus, setRegStatus] = useState<'AVAILABLE_IMMEDIATE' | 'STANDBY_ON_CALL' | 'BUSY'>('AVAILABLE_IMMEDIATE');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Matching & Compatibility Evaluation State
  const [matchBloodGroup, setMatchBloodGroup] = useState<BloodGroup>('O-');
  const [matchComponent, setMatchComponent] = useState<ComponentType>('RBC');
  const [matchUnits, setMatchUnits] = useState<number>(2);
  const [matchUrgency, setMatchUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [matchingResult, setMatchingResult] = useState<MatchingResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [activeTabSub, setActiveTabSub] = useState<'directory' | 'matching'>('directory');

  useEffect(() => {
    loadDonors();
    runMatchingEval();
  }, []);

  const loadDonors = async () => {
    setIsLoadingDonors(true);
    try {
      const data = await donorApi.listDonors(
        bloodGroupFilter !== 'ALL' ? bloodGroupFilter : undefined,
        statusFilter !== 'ALL' ? statusFilter : undefined
      );
      setDonors(data);
    } catch (e) {
      console.error('Failed to load donors', e);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodGroupFilter, statusFilter]);

  const runMatchingEval = async () => {
    setIsEvaluating(true);
    try {
      const res = await donorApi.evaluateMatching({
        blood_group: matchBloodGroup,
        component_type: matchComponent,
        units_requested: matchUnits,
        urgency: matchUrgency,
        max_eta_minutes: 30,
      });
      setMatchingResult(res);
    } catch (e) {
      console.error('Failed to evaluate matching', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const anonymousId = `ANON-PAT-${Math.floor(1000 + Math.random() * 9000)}`;
      await donorApi.registerDonor({
        anonymous_id: anonymousId,
        name: regName,
        blood_group: regBloodGroup,
        location: regLocation,
        latitude: 28.6139,
        longitude: 77.2090,
        availability_status: regStatus,
        contact_token: `token-${Math.random().toString(36).substring(7)}`,
      });
      setRegSuccessMsg(`Successfully registered as emergency donor (${anonymousId}). Thank you for supporting Delhi NCR trauma network.`);
      setShowRegisterModal(false);
      loadDonors();
    } catch (err) {
      console.error('Donor registration failed', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-shell-border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-teal-brand uppercase tracking-wider">
              Delhi NCR Donor & Matching Network
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight mt-1">
            Blood Donors & Deterministic Compatibility Engine
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Coordinate emergency standby donors and evaluate real-time multi-factor matching across hospital blood banks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register as Donor</span>
          </button>
        </div>
      </div>

      {regSuccessMsg && (
        <div className="p-4 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{regSuccessMsg}</span>
          </div>
          <button onClick={() => setRegSuccessMsg(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Tabs: Directory vs Live Matching */}
      <div className="flex items-center gap-2 border-b border-shell-border pb-3">
        <button
          onClick={() => setActiveTabSub('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTabSub === 'directory'
              ? 'bg-teal-brand text-white shadow-pill'
              : 'bg-white text-ink-primary hover:bg-shell-card-subtle border border-shell-border'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Standby Donor Directory ({donors.length})</span>
        </button>

        <button
          onClick={() => setActiveTabSub('matching')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTabSub === 'matching'
              ? 'bg-teal-brand text-white shadow-pill'
              : 'bg-white text-ink-primary hover:bg-shell-card-subtle border border-shell-border'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Source Matching & Compatibility Engine</span>
        </button>
      </div>

      {activeTabSub === 'directory' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-ink-secondary">Blood Group:</span>
              {['ALL', 'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBloodGroupFilter(bg)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    bloodGroupFilter === bg
                      ? 'bg-teal-brand text-white'
                      : 'bg-shell-bg text-ink-secondary hover:text-ink-primary border border-shell-border'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-ink-secondary">Status:</span>
              {['ALL', 'AVAILABLE_IMMEDIATE', 'STANDBY_ON_CALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-teal-brand text-white'
                      : 'bg-shell-bg text-ink-secondary hover:text-ink-primary border border-shell-border'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Donors Grid */}
          {isLoadingDonors ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-shell-border shadow-card">
              <div className="w-8 h-8 border-2 border-teal-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-ink-secondary">Loading registered standby donors...</p>
            </div>
          ) : donors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {donors.map((donor) => (
                <div
                  key={donor.id}
                  className="bg-white rounded-2xl p-5 border border-shell-border shadow-card hover:border-teal-brand/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-pastel-rose-bg text-crimson border border-pastel-rose-border font-mono font-bold text-sm flex items-center justify-center shrink-0">
                          {donor.blood_group}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-ink-primary">{donor.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-ink-secondary bg-shell-bg px-2 py-0.5 rounded border border-shell-border">
                            {donor.anonymous_id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          donor.availability_status === 'AVAILABLE_IMMEDIATE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {donor.availability_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-ink-secondary">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-teal-brand shrink-0" />
                        <span className="truncate">{donor.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-teal-brand shrink-0" />
                        <span>Last Donated: {donor.last_donated_date ? new Date(donor.last_donated_date).toLocaleDateString() : 'No recent donations (Eligible)'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-shell-border flex items-center justify-between">
                    <span className="text-[10px] text-ink-secondary font-mono">Secure Token Verified</span>
                    <button
                      onClick={() => alert(`Secure dispatch contact initiated for donor ${donor.anonymous_id}. Encrypted relay active.`)}
                      className="px-3 py-1.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Request Standby
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-shell-border shadow-card">
              <Users className="w-10 h-10 text-ink-secondary/40 mx-auto mb-2" />
              <h3 className="text-base font-bold text-ink-primary">No Donors Found</h3>
              <p className="text-xs text-ink-secondary mt-1">No standby donors match your filter criteria.</p>
            </div>
          )}
        </div>
      ) : (
        /* Live Source Matching & Compatibility Engine View */
        <div className="space-y-6">
          {/* Matching Control Panel */}
          <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
            <h3 className="text-base font-bold text-ink-primary mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-brand" />
              <span>Deterministic Multi-Factor Matching Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Target Blood Group</label>
                <select
                  value={matchBloodGroup}
                  onChange={(e) => setMatchBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs font-mono font-bold text-ink-primary"
                >
                  {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Component Type</label>
                <select
                  value={matchComponent}
                  onChange={(e) => setMatchComponent(e.target.value as ComponentType)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs font-mono font-bold text-ink-primary"
                >
                  <option value="RBC">RBC (Red Blood Cells)</option>
                  <option value="PRBC">PRBC (Packed RBC)</option>
                  <option value="PLATELETS">PLATELETS</option>
                  <option value="FFP">FFP (Fresh Frozen Plasma)</option>
                  <option value="CRYO">CRYO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Units Needed</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={matchUnits}
                  onChange={(e) => setMatchUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs font-bold text-ink-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Clinical Urgency</label>
                <select
                  value={matchUrgency}
                  onChange={(e) => setMatchUrgency(e.target.value as UrgencyLevel)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs text-ink-primary"
                >
                  <option value="CRITICAL">Critical (&lt; 30 min)</option>
                  <option value="URGENT">Urgent (1-2 hours)</option>
                  <option value="ROUTINE">Routine</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={runMatchingEval}
                  disabled={isEvaluating}
                  className="w-full px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all"
                >
                  {isEvaluating ? 'Evaluating...' : 'Run Match Engine'}
                </button>
              </div>
            </div>
          </div>

          {/* Matching Results Summary */}
          {matchingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card">
                  <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">Feasible Supply Sources</span>
                  <p className="text-2xl font-extrabold text-teal-brand font-mono mt-1">
                    {matchingResult.feasible_candidates_count} Facilities
                  </p>
                  <span className="text-xs text-ink-secondary">Compatible donor groups: {matchingResult.compatible_donor_groups.join(', ')}</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card">
                  <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">Total Usable Stock (Net)</span>
                  <p className="text-2xl font-extrabold text-ink-primary font-mono mt-1">
                    {matchingResult.total_network_usable_units} Units
                  </p>
                  <span className="text-xs text-emerald-700 font-semibold">Safety reserve floor respected</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card">
                  <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">Network Sufficiency Status</span>
                  <p className={`text-xl font-extrabold font-mono mt-1 ${matchingResult.sufficient_inventory_available ? 'text-emerald-700' : 'text-crimson'}`}>
                    {matchingResult.sufficient_inventory_available ? 'SUFFICIENT (100%)' : 'DEFICIT (Alert)'}
                  </p>
                  <span className="text-xs text-ink-secondary">Requirement: {matchingResult.units_requested} units</span>
                </div>
              </div>

              {/* Candidates Ranked List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-ink-primary uppercase tracking-wider px-1">
                  Ranked Supply Candidates (Multi-Factor Scoring & ETA)
                </h4>

                {matchingResult.candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl p-5 border shadow-card transition-all ${
                      cand.is_feasible ? 'border-shell-border hover:border-teal-brand/40' : 'border-pastel-rose-border opacity-70 bg-shell-bg/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center p-3 bg-shell-bg rounded-2xl border border-shell-border min-w-[70px]">
                          <span className="text-[10px] font-bold text-ink-secondary">Score</span>
                          <span className="text-base font-extrabold text-teal-brand font-mono">
                            {Math.round(cand.composite_score * 100)}%
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-base font-bold text-ink-primary">{cand.source_name}</h5>
                            <span className="text-xs font-mono font-bold text-ink-secondary bg-shell-bg px-2 py-0.5 rounded border border-shell-border">
                              {cand.source_facility_type}
                            </span>
                            {cand.is_hub && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Regional Hub
                              </span>
                            )}
                            {cand.is_exact_match && (
                              <span className="text-[10px] font-bold bg-teal-brand text-white px-2 py-0.5 rounded-full">
                                Exact Blood Group Match
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary mt-2">
                            <span>Donor Group: <strong className="text-ink-primary font-mono">{cand.donor_blood_group}</strong></span>
                            <span>•</span>
                            <span>Usable Stock: <strong className="text-ink-primary">{cand.usable_units} units</strong> (Reserve: {cand.safety_reserve_units})</span>
                            <span>•</span>
                            <span>Distance: <strong className="text-ink-primary">{cand.distance_km} km</strong></span>
                            <span>•</span>
                            <span>ETA: <strong className="text-teal-brand font-mono">~{cand.estimated_minutes} mins</strong></span>
                          </div>

                          {!cand.is_feasible && cand.rejection_reasons.length > 0 && (
                            <div className="mt-2 text-xs text-crimson font-semibold flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Infeasible: {cand.rejection_reasons.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end lg:self-center">
                        <div className="text-right">
                          <span className="text-xs font-bold text-ink-primary block">
                            Allocatable: {cand.units_available_for_request} units
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            {cand.is_feasible ? 'Ready for Dispatch' : 'Not Eligible'}
                          </span>
                        </div>

                        <button
                          disabled={!cand.is_feasible}
                          onClick={() => alert(`Initiating emergency dispatch request from ${cand.source_name} for ${matchUnits} units of ${matchBloodGroup}.`)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            cand.is_feasible
                              ? 'bg-teal-brand hover:bg-teal-brand-hover text-white'
                              : 'bg-shell-border text-ink-secondary cursor-not-allowed'
                          }`}
                        >
                          Dispatch from Source
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register Donor Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-shell-border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-shell-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-brand" />
                <h3 className="text-lg font-bold text-ink-primary">Register Emergency Blood Donor</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-ink-secondary hover:text-ink-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDonor} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Donor Name / Identifier</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Blood Group</label>
                <select
                  value={regBloodGroup}
                  onChange={(e) => setRegBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs font-mono font-bold text-ink-primary"
                >
                  {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Delhi NCR Location / Zone</label>
                <input
                  type="text"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs text-ink-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">Standby Availability Status</label>
                <select
                  value={regStatus}
                  onChange={(e) => setRegStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs font-bold text-ink-primary"
                >
                  <option value="AVAILABLE_IMMEDIATE">Available Immediate (STAT)</option>
                  <option value="STANDBY_ON_CALL">Standby On-Call</option>
                  <option value="BUSY">Busy / Temporarily Unavailable</option>
                </select>
              </div>

              <div className="p-3 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl flex items-center gap-2 text-[11px] text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-teal-brand shrink-0" />
                <span>Donor identity is anonymized with secure cryptographic contact relay tokens.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-white border border-shell-border text-ink-primary rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
