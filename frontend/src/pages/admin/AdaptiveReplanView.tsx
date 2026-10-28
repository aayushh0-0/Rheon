import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, XCircle, Plus, Zap, RotateCcw, Shield, Activity, Clock,
} from 'lucide-react';
import {
  DEMO_INVENTORY,
  TEST_MODE_DELAY_MS,
  BloodGroup,
  ComponentType,
  Urgency,
  LocalBloodRequest,
  availableUnits,
  createBloodRequest,
  getReservationsForHospital,
  getRequest,
  listRequests,
  markTestTimerStarted,
  resetAllScenarios,
  runAdaptiveReplan,
  triggerDisruption,
} from '../../services/adaptiveReplanApi';

const GROUPS: BloodGroup[] = ['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const AdaptiveReplanView: React.FC = () => {
  const [requests, setRequests] = useState<LocalBloodRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<LocalBloodRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [patientRef, setPatientRef] = useState('');
  const [group, setGroup] = useState<BloodGroup>('O-');
  const [component, setComponent] = useState<ComponentType>('RBC');
  const [units, setUnits] = useState(2);
  const [urgency, setUrgency] = useState<Urgency>('CRITICAL');
  const [hospitalId, setHospitalId] = useState(DEMO_INVENTORY[0].id);

  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    const list = listRequests();
    setRequests(list);
    if (selectedId) {
      const r = getRequest(selectedId) || null;
      setSelected(r);
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearTimers = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    timerRef.current = null;
    tickRef.current = null;
    setCountdown(null);
  };

  useEffect(() => () => clearTimers(), []);

  // TEST MODE timer — only once per request (disruption_fired + test_timer_started_at)
  useEffect(() => {
    clearTimers();
    if (!testMode || !selected || selected.disruption_fired) return;
    if (selected.revised_plan?.status === 'ACTIVE') return;

    markTestTimerStarted(selected.id);
    const started = selected.test_timer_started_at
      ? new Date(selected.test_timer_started_at).getTime()
      : Date.now();
    const ends = started + TEST_MODE_DELAY_MS;
    const left0 = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
    if (left0 <= 0) {
      // Timer already elapsed while away — fire once if not disrupted
      if (!selected.disruption_fired) {
        triggerDisruption(selected.id, 'TEST_MODE');
        runAdaptiveReplan(selected.id);
        refresh();
      }
      return;
    }
    setCountdown(left0);
    tickRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      setCountdown(left);
    }, 1000);
    timerRef.current = window.setTimeout(() => {
      const r = getRequest(selected.id);
      if (r && !r.disruption_fired) {
        triggerDisruption(selected.id, 'TEST_MODE');
        runAdaptiveReplan(selected.id);
        refresh();
      }
      setCountdown(0);
    }, left0 * 1000);

    return () => clearTimers();
  }, [testMode, selected?.id, selected?.disruption_fired, refresh]);

  const selectRequest = (id: string) => {
    setSelectedId(id);
    setSelected(getRequest(id) || null);
    setError(null);
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = createBloodRequest({
      patient_ref: patientRef || `PAT-${Date.now().toString().slice(-5)}`,
      blood_group: group,
      component,
      units_requested: units,
      urgency,
      hospital_id: hospitalId,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setShowForm(false);
    setPatientRef('');
    refresh();
    selectRequest(res.request.id);
  };

  const onTriggerDisruption = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      triggerDisruption(selectedId, 'MANUAL');
      // short staged delay for presentation
      await new Promise((r) => setTimeout(r, 400));
      runAdaptiveReplan(selectedId);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    if (!window.confirm('Reset all frontend simulation requests, plans, and reservations?')) return;
    clearTimers();
    resetAllScenarios();
    setSelectedId('');
    setSelected(null);
    setRequests([]);
    setError(null);
  };

  const availForForm = availableUnits(hospitalId, group);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
        <p className="text-[10px] font-bold text-teal-brand uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" /> CMO · Frontend simulation
        </p>
        <h2 className="text-xl font-black text-ink-primary mt-0.5">Adaptive Re-Planning</h2>
        <p className="text-xs text-ink-secondary mt-1">
          Request-driven workflow with <strong>demonstration inventory</strong> and localStorage.
          Agent steps are labelled <em>Frontend Simulation</em> — not live LLM or backend execution.
          Does not authorize transfusion.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-shell-border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-teal-brand text-white"
          >
            <Plus className="w-3.5 h-3.5" /> New Blood Request
          </button>
          <button
            type="button"
            disabled={!selectedId || !selected || selected.disruption_fired || busy}
            onClick={onTriggerDisruption}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-900 disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" /> Trigger Disruption Now
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border border-shell-border text-ink-secondary"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Test Scenario
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
          TEST MODE
          {testMode && countdown != null && countdown > 0 && selected && !selected.disruption_fired && (
            <span className="text-amber-700 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" /> auto-disrupt in {countdown}s
            </span>
          )}
        </label>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs px-4 py-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <form onSubmit={onCreate} className="bg-white rounded-3xl border border-shell-border shadow-card p-5 space-y-3">
          <p className="text-[10px] font-bold text-ink-secondary uppercase">New blood request (frontend simulation)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Patient / request ref</label>
              <input
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                placeholder="Optional — auto if empty"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Blood group</label>
              <select value={group} onChange={(e) => setGroup(e.target.value as BloodGroup)} className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs">
                {GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Component</label>
              <select value={component} onChange={(e) => setComponent(e.target.value as ComponentType)} className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs">
                <option value="RBC">RBC</option>
                <option value="PLATELETS">Platelets</option>
                <option value="FFP">FFP</option>
                <option value="CRYO">Cryo</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Units</label>
              <input type="number" min={1} max={20} value={units} onChange={(e) => setUnits(parseInt(e.target.value, 10) || 1)} className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)} className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs">
                <option value="CRITICAL">CRITICAL</option>
                <option value="URGENT">URGENT</option>
                <option value="ROUTINE">ROUTINE</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Initial hospital / blood bank</label>
              <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs">
                {DEMO_INVENTORY.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (demo {availableUnits(h.id, group)}u {group} free)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-secondary mt-1">
                Unreserved demo stock here: <strong>{availForForm}</strong>u {group}
              </p>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white">
            Submit request & create original plan
          </button>
        </form>
      )}

      {/* Request list */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4">
        <p className="text-[10px] font-bold text-ink-secondary uppercase mb-2">Requests (localStorage)</p>
        {requests.length === 0 ? (
          <p className="text-xs text-ink-secondary">No requests yet. Use New Blood Request — page does not preload demo emergencies.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead>
                <tr className="text-[10px] uppercase text-ink-secondary border-b border-shell-border">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 pr-2">Patient ref</th>
                  <th className="py-2 pr-2">Group</th>
                  <th className="py-2 pr-2">Units</th>
                  <th className="py-2 pr-2">Initial source</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => selectRequest(r.id)}
                    className={`border-b border-shell-border/50 cursor-pointer hover:bg-shell-bg ${selectedId === r.id ? 'bg-teal-brand/5' : ''}`}
                  >
                    <td className="py-2 pr-2 font-mono font-bold">{r.id}</td>
                    <td className="py-2 pr-2">{r.patient_ref}</td>
                    <td className="py-2 pr-2">{r.blood_group} · {r.component}</td>
                    <td className="py-2 pr-2">{r.units_requested}</td>
                    <td className="py-2 pr-2">{r.hospital_name}</td>
                    <td className="py-2 pr-2 font-bold">{r.status}</td>
                    <td className="py-2 text-ink-secondary">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-side plans */}
      {selected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4">
              <p className="text-[10px] font-bold text-ink-secondary uppercase mb-2">Original plan</p>
              {selected.original_plan ? (
                <ul className="text-xs space-y-1.5">
                  <li><strong>Hospital:</strong> {selected.original_plan.hospital_name}</li>
                  <li><strong>Group / component:</strong> {selected.original_plan.blood_group} · {selected.original_plan.component}</li>
                  <li><strong>Requested / allocated:</strong> {selected.original_plan.units_requested}u / {selected.original_plan.units_allocated}u</li>
                  <li><strong>Stock at selection (demo):</strong> {selected.original_plan.available_at_selection}u</li>
                  <li><strong>ETA:</strong> {selected.original_plan.eta_minutes} min · {selected.original_plan.transport_mode}</li>
                  <li><strong>Status:</strong> <span className="font-bold">{selected.original_plan.status}</span></li>
                  {selected.original_plan.disruption_reason && (
                    <li className="text-amber-800"><strong>Disruption:</strong> {selected.original_plan.disruption_reason}</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-ink-secondary">—</p>
              )}
            </div>
            <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4">
              <p className="text-[10px] font-bold text-ink-secondary uppercase mb-2">Revised plan</p>
              {selected.revised_plan ? (
                <ul className="text-xs space-y-1.5">
                  <li><strong>Alternative hospital:</strong> {selected.revised_plan.hospital_name}</li>
                  <li><strong>Compatible stock (demo):</strong> {selected.revised_plan.available_at_selection}u</li>
                  <li><strong>Units allocated:</strong> {selected.revised_plan.units_allocated}u</li>
                  <li><strong>ETA:</strong> {selected.revised_plan.eta_minutes} min · {selected.revised_plan.transport_mode}</li>
                  <li>
                    <strong>Safety validation:</strong>{' '}
                    {selected.revised_plan.validation.passed ? 'PASS' : 'FAIL'}
                  </li>
                  {selected.revised_plan.replanning_reason && (
                    <li><strong>Reason:</strong> {selected.revised_plan.replanning_reason}</li>
                  )}
                  <li><strong>Final status:</strong> <span className="font-bold">{selected.revised_plan.status}</span></li>
                </ul>
              ) : selected.status === 'ESCALATED' || selected.status === 'BLOCKED' ? (
                <p className="text-xs text-red-700 font-bold">
                  {selected.status} — no safe alternative activated. Blood-bank verification / escalation required.
                </p>
              ) : (
                <p className="text-xs text-ink-secondary">No revision yet. Trigger disruption (or wait for TEST MODE).</p>
              )}
              {selected.revised_plan?.validation.checks && (
                <div className="mt-3 grid grid-cols-1 gap-1">
                  {selected.revised_plan.validation.checks.map((c) => (
                    <div key={c.name} className={`text-[10px] rounded-lg border px-2 py-1 ${c.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                      {c.passed ? '✓' : '✗'} {c.name}: {c.detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4">
            <p className="text-[10px] font-bold text-ink-secondary uppercase mb-3 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Timeline
            </p>
            <ol className="space-y-2">
              {selected.timeline.map((t) => (
                <li key={t.id} className="border-l-2 border-shell-border pl-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{t.label}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${t.kind === 'TEST_MODE' ? 'bg-amber-100 text-amber-900' : t.kind === 'Frontend Simulation' ? 'bg-slate-100' : 'bg-teal-brand/10 text-teal-brand'}`}>
                      {t.kind}
                    </span>
                    {t.tone === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {t.tone === 'error' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                    {t.tone === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  {t.detail && <p className="text-ink-secondary mt-0.5">{t.detail}</p>}
                  <p className="text-[10px] text-ink-secondary">{new Date(t.at).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Agent trace */}
          <div className="bg-white rounded-3xl border border-shell-border shadow-card p-4">
            <p className="text-[10px] font-bold text-ink-secondary uppercase mb-2">Agent timeline (Frontend Simulation)</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.agent_trace.map((a, i) => (
                <div key={`${a.agent}-${i}`} className="rounded-xl border border-shell-border p-2.5 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{a.agent}</span>
                    <span className="text-[9px] font-bold uppercase text-ink-secondary">{a.kind}</span>
                  </div>
                  <p className="text-ink-secondary">{a.responsibility}</p>
                  <p className="mt-0.5">{a.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reservations insight */}
          <div className="bg-white rounded-2xl border border-dashed border-shell-border p-3 text-[11px] text-ink-secondary">
            <p className="font-bold text-ink-primary mb-1">Demonstration reservations (this browser only)</p>
            {DEMO_INVENTORY.map((h) => {
              const res = getReservationsForHospital(h.id);
              if (!res.length) return null;
              return (
                <p key={h.id}>
                  {h.name}: {res.map((x) => `${x.request_id} holds ${x.units}u ${x.group}`).join('; ')}
                </p>
              );
            })}
            {DEMO_INVENTORY.every((h) => getReservationsForHospital(h.id).length === 0) && (
              <p>No active reservations.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
