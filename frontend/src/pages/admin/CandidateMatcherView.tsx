import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitMerge,
  Search,
  Phone,
  UserCheck,
  MapPin,
  Clock,
  Droplets,
  ShieldCheck,
  Building2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Star,
  Activity,
} from 'lucide-react';
import {
  donorApi,
  Donor,
  MatchingResponse,
  RankedDonorCandidate,
  rankDonorCandidates,
} from '../../services/donorApi';
import { BloodGroup, ComponentType, UrgencyLevel } from '../../types';

type ActionToast = { type: 'success' | 'info'; message: string } | null;

const BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCIES: UrgencyLevel[] = ['CRITICAL', 'CRITICAL_IMMEDIATE', 'URGENT', 'URGENT_SURGICAL', 'ROUTINE'];

// Approximate hospital hubs used as recipient anchor for distance scoring
const HOSPITAL_ANCHORS: { id: string; name: string; lat: number; lng: number }[] = [
  { id: 'aiims', name: 'AIIMS Trauma Centre', lat: 28.5672, lng: 77.21 },
  { id: 'safdarjung', name: 'Safdarjung Hospital', lat: 28.567, lng: 77.2085 },
  { id: 'max-saket', name: 'Max Saket', lat: 28.5244, lng: 77.2066 },
  { id: 'medanta', name: 'Medanta Gurugram', lat: 28.4397, lng: 77.0405 },
  { id: 'apollo', name: 'Indraprastha Apollo', lat: 28.5418, lng: 77.2838 },
];

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE_IMMEDIATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STANDBY_ON_CALL: 'bg-amber-50 text-amber-700 border-amber-200',
  BUSY: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE_IMMEDIATE: 'Available now',
  STANDBY_ON_CALL: 'Standby',
  BUSY: 'Busy',
};

export const CandidateMatcherView: React.FC = () => {
  // Criteria
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [componentType, setComponentType] = useState<ComponentType>('RBC');
  const [units, setUnits] = useState(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [hospitalId, setHospitalId] = useState(HOSPITAL_ANCHORS[0].id);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [donors, setDonors] = useState<Donor[]>([]);
  const [facilityMatch, setFacilityMatch] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  // Actions
  const [toast, setToast] = useState<ActionToast>(null);
  const [contactDonor, setContactDonor] = useState<RankedDonorCandidate | null>(null);
  const [appointDonor, setAppointDonor] = useState<RankedDonorCandidate | null>(null);
  const [appointNote, setAppointNote] = useState('');
  const [pendingAppointments, setPendingAppointments] = useState<
    { donorId: string; donorName: string; bloodGroup: string; note: string; at: string }[]
  >([]);

  const anchor = HOSPITAL_ANCHORS.find((h) => h.id === hospitalId) || HOSPITAL_ANCHORS[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await donorApi.listDonors();
      setDonors(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runFacilityMatch = useCallback(async () => {
    setEvaluating(true);
    try {
      const res = await donorApi.evaluateMatching({
        blood_group: bloodGroup,
        component_type: componentType,
        units_requested: units,
        urgency,
        max_eta_minutes: urgency.startsWith('CRITICAL') ? 20 : 45,
      });
      setFacilityMatch(res);
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  }, [bloodGroup, componentType, units, urgency]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    runFacilityMatch();
  }, [runFacilityMatch]);

  const rankedDonors = useMemo(() => {
    let ranked = rankDonorCandidates(donors, bloodGroup, anchor.lat, anchor.lng);
    if (statusFilter !== 'ALL') {
      ranked = ranked.filter((d) => d.availability_status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      ranked = ranked.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.anonymous_id.toLowerCase().includes(q) ||
          d.blood_group.toLowerCase().includes(q)
      );
    }
    return ranked;
  }, [donors, bloodGroup, anchor, statusFilter, searchQuery]);

  const showToast = (type: 'success' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDirectContact = (donor: RankedDonorCandidate) => {
    setContactDonor(donor);
  };

  const confirmDirectContact = () => {
    if (!contactDonor) return;
    showToast(
      'success',
      `Contact bridge opened for ${contactDonor.name}. Secure token ${contactDonor.contact_token.slice(0, 12)}… shared with care team.`
    );
    setContactDonor(null);
  };

  const handleRequestAdminAppoint = (donor: RankedDonorCandidate) => {
    setAppointDonor(donor);
    setAppointNote('');
  };

  const confirmAdminAppoint = () => {
    if (!appointDonor) return;
    const entry = {
      donorId: appointDonor.id,
      donorName: appointDonor.name,
      bloodGroup: appointDonor.blood_group,
      note: appointNote || `Appoint for ${bloodGroup} ${componentType} × ${units} at ${anchor.name}`,
      at: new Date().toISOString(),
    };
    setPendingAppointments((prev) => [entry, ...prev]);
    showToast(
      'success',
      `Admin appointment request logged for ${appointDonor.name}. Coordination team notified.`
    );
    setAppointDonor(null);
    setAppointNote('');
  };

  const handleMarkAppointed = async (donor: RankedDonorCandidate) => {
    try {
      await donorApi.updateDonorStatus(donor.id, 'BUSY');
      await load();
      showToast('info', `${donor.name} marked as appointed / BUSY in the registry.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-teal-700" />
            <h1 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
              Candidate Matcher
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-700/10 text-teal-800 border border-teal-700/20">
              Live ranking
            </span>
          </div>
          <p className="text-xs md:text-sm text-ink-secondary mt-1 max-w-2xl">
            Rank the best available living donors and facility stock for a blood need. Contact donors
            directly or raise an admin appointment request for coordination.
          </p>
        </div>
        {toast && (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border shadow-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast.message}
          </div>
        )}
      </div>

      {/* Criteria panel */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-ink-secondary" />
          <h2 className="text-sm font-bold text-ink-primary">Match criteria</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Recipient group
            </span>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
              className="rounded-xl border border-shell-border bg-shell-bg/40 px-3 py-2 text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            >
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Component
            </span>
            <select
              value={componentType}
              onChange={(e) => setComponentType(e.target.value as ComponentType)}
              className="rounded-xl border border-shell-border bg-shell-bg/40 px-3 py-2 text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            >
              {(['RBC', 'PRBC', 'FFP', 'PLATELETS', 'CRYO'] as ComponentType[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Units
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={units}
              onChange={(e) => setUnits(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-xl border border-shell-border bg-shell-bg/40 px-3 py-2 text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Urgency
            </span>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
              className="rounded-xl border border-shell-border bg-shell-bg/40 px-3 py-2 text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            >
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {u.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Destination hospital (distance anchor)
            </span>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="rounded-xl border border-shell-border bg-shell-bg/40 px-3 py-2 text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            >
              {HOSPITAL_ANCHORS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<UsersIcon />}
          label="Compatible donors"
          value={String(rankedDonors.length)}
          sub={`${rankedDonors.filter((d) => d.availability_status === 'AVAILABLE_IMMEDIATE').length} immediate`}
        />
        <SummaryCard
          icon={<Star className="w-4 h-4" />}
          label="Top match score"
          value={rankedDonors[0] ? `${rankedDonors[0].matchScore}` : '—'}
          sub={rankedDonors[0]?.name ?? 'No candidates'}
        />
        <SummaryCard
          icon={<Building2 className="w-4 h-4" />}
          label="Facility sources"
          value={String(facilityMatch?.feasible_candidates_count ?? '—')}
          sub={
            facilityMatch?.sufficient_inventory_available
              ? 'Stock sufficient'
              : evaluating
                ? 'Evaluating…'
                : 'Check inventory'
          }
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4" />}
          label="Admin requests"
          value={String(pendingAppointments.length)}
          sub="Pending coordination"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Living donor rankings — main */}
        <div className="xl:col-span-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <Droplets className="w-4 h-4 text-rose-600" />
              Ranked living donors
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, zone…"
                  className="pl-8 pr-3 py-1.5 rounded-full border border-shell-border bg-white text-xs font-medium w-44 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-shell-border bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              >
                <option value="ALL">All status</option>
                <option value="AVAILABLE_IMMEDIATE">Available now</option>
                <option value="STANDBY_ON_CALL">Standby</option>
                <option value="BUSY">Busy</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-shell-border p-10 text-center text-sm text-ink-secondary">
              Loading donor registry…
            </div>
          ) : rankedDonors.length === 0 ? (
            <div className="bg-white rounded-3xl border border-shell-border p-10 text-center">
              <AlertCircle className="w-8 h-8 text-ink-secondary mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink-primary">No compatible donors</p>
              <p className="text-xs text-ink-secondary mt-1">
                Adjust blood group or status filters, or register more standby donors.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rankedDonors.map((donor, idx) => (
                <DonorCard
                  key={donor.id}
                  donor={donor}
                  rank={idx + 1}
                  onContact={() => handleDirectContact(donor)}
                  onRequestAdmin={() => handleRequestAdminAppoint(donor)}
                  onAppoint={() => handleMarkAppointed(donor)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column: facility matches + pending admin requests */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700" />
                Facility stock matches
              </h2>
              {evaluating && (
                <span className="text-[10px] font-bold text-ink-secondary animate-pulse">
                  Updating…
                </span>
              )}
            </div>
            {!facilityMatch ? (
              <p className="text-xs text-ink-secondary">No facility evaluation yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {facilityMatch.candidates
                  .filter((c) => c.is_feasible)
                  .slice(0, 5)
                  .map((c) => (
                    <div
                      key={c.source_facility_id}
                      className="rounded-2xl border border-shell-border bg-shell-bg/30 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-ink-primary leading-snug">
                            {c.source_name}
                          </p>
                          <p className="text-[10px] text-ink-secondary mt-0.5">
                            {c.source_facility_type.replace('_', ' ')} · {c.donor_blood_group}
                            {c.is_exact_match ? ' · Exact' : c.is_universal_donor ? ' · Universal' : ''}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                          {(c.composite_score * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-medium text-ink-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          {c.units_available_for_request}/{units} units
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {c.distance_km} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{c.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                  ))}
                {facilityMatch.candidates.filter((c) => c.is_feasible).length === 0 && (
                  <p className="text-xs text-ink-secondary">No feasible facility sources for this need.</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
            <h2 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              Admin appointment queue
            </h2>
            {pendingAppointments.length === 0 ? (
              <p className="text-xs text-ink-secondary leading-relaxed">
                When a patient or staff member cannot reach a donor, they can request admin to contact
                and appoint a matched candidate. Those requests appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pendingAppointments.map((a, i) => (
                  <li
                    key={`${a.donorId}-${i}`}
                    className="rounded-2xl border border-amber-100 bg-amber-50/50 px-3 py-2.5"
                  >
                    <p className="text-xs font-bold text-ink-primary">
                      {a.donorName}{' '}
                      <span className="font-semibold text-rose-700">({a.bloodGroup})</span>
                    </p>
                    <p className="text-[10px] text-ink-secondary mt-0.5 line-clamp-2">{a.note}</p>
                    <p className="text-[10px] text-ink-secondary/80 mt-1 font-mono">
                      {new Date(a.at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Direct contact modal */}
      {contactDonor && (
        <Modal onClose={() => setContactDonor(null)} title="Contact donor directly">
          <p className="text-sm text-ink-secondary mb-4">
            Open a secure contact channel with{' '}
            <span className="font-bold text-ink-primary">{contactDonor.name}</span> (
            {contactDonor.blood_group}). Privacy token is issued only to authorized care staff.
          </p>
          <div className="rounded-2xl bg-shell-bg/50 border border-shell-border p-3 mb-4 text-xs space-y-1">
            <p>
              <span className="font-semibold">Location:</span> {contactDonor.location}
            </p>
            <p>
              <span className="font-semibold">ETA to {anchor.name}:</span> ~{contactDonor.etaMinutes}{' '}
              min ({contactDonor.distanceKm} km)
            </p>
            <p>
              <span className="font-semibold">Token:</span>{' '}
              <span className="font-mono">{contactDonor.contact_token}</span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setContactDonor(null)}
              className="px-4 py-2 rounded-full text-xs font-bold text-ink-secondary hover:bg-shell-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDirectContact}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-teal-800 text-white hover:bg-teal-900"
            >
              <Phone className="w-3.5 h-3.5" />
              Open contact bridge
            </button>
          </div>
        </Modal>
      )}

      {/* Admin appoint request modal */}
      {appointDonor && (
        <Modal onClose={() => setAppointDonor(null)} title="Request admin to appoint donor">
          <p className="text-sm text-ink-secondary mb-3">
            Log a coordination request for{' '}
            <span className="font-bold text-ink-primary">{appointDonor.name}</span>. Admin / CMO
            desk will contact and appoint this candidate.
          </p>
          <label className="flex flex-col gap-1 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Note for coordination team
            </span>
            <textarea
              value={appointNote}
              onChange={(e) => setAppointNote(e.target.value)}
              rows={3}
              placeholder={`e.g. Need ${units} units ${bloodGroup} ${componentType} at ${anchor.name} — patient cannot self-contact.`}
              className="rounded-2xl border border-shell-border bg-shell-bg/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/30 resize-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAppointDonor(null)}
              className="px-4 py-2 rounded-full text-xs font-bold text-ink-secondary hover:bg-shell-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAdminAppoint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-teal-800 text-white hover:bg-teal-900"
            >
              <Send className="w-3.5 h-3.5" />
              Submit request
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-shell-border shadow-card px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-ink-secondary mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-extrabold text-ink-primary tabular-nums">{value}</p>
      <p className="text-[11px] text-ink-secondary mt-0.5 truncate">{sub}</p>
    </div>
  );
}

function DonorCard({
  donor,
  rank,
  onContact,
  onRequestAdmin,
  onAppoint,
}: {
  donor: RankedDonorCandidate;
  rank: number;
  onContact: () => void;
  onRequestAdmin: () => void;
  onAppoint: () => void;
}) {
  const busy = donor.availability_status === 'BUSY';
  return (
    <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
              rank === 1
                ? 'bg-teal-800 text-white'
                : rank === 2
                  ? 'bg-teal-700/80 text-white'
                  : 'bg-shell-bg text-ink-primary border border-shell-border'
            }`}
          >
            #{rank}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink-primary truncate">{donor.name}</h3>
              <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md">
                {donor.blood_group}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[donor.availability_status]}`}
              >
                {STATUS_LABELS[donor.availability_status]}
              </span>
              {donor.isExactMatch && (
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full">
                  Exact match
                </span>
              )}
              {donor.isUniversalDonor && !donor.isExactMatch && (
                <span className="text-[10px] font-bold text-violet-800 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                  Universal
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-secondary mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {donor.location}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] font-medium text-ink-secondary">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />~{donor.etaMinutes} min · {donor.distanceKm} km
              </span>
              {donor.daysSinceDonation !== null && (
                <span>Last donation: {donor.daysSinceDonation}d ago</span>
              )}
              <span className="font-mono text-[10px] opacity-70">{donor.anonymous_id}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {donor.rankReasons.map((r) => (
                <span
                  key={r}
                  className="text-[10px] font-medium text-ink-secondary bg-shell-bg border border-shell-border px-2 py-0.5 rounded-full"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
          <div className="text-right mb-0.5 hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Match score
            </p>
            <p className="text-lg font-extrabold text-teal-800 tabular-nums">{donor.matchScore}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={onContact}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border border-shell-border bg-white text-ink-primary hover:bg-shell-bg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Phone className="w-3 h-3" />
              Contact
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRequestAdmin}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border border-teal-700/30 bg-teal-50 text-teal-900 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              Request admin
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAppoint}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-3 h-3" />
              Appoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/30 backdrop-blur-[2px]">
      <div
        role="dialog"
        className="bg-white rounded-3xl border border-shell-border shadow-xl w-full max-w-md p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-shell-bg text-ink-secondary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
