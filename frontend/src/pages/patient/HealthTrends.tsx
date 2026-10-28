import React, { useMemo, useState, useEffect } from 'react';
import { Activity, Filter, ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { medicalApi, MedicalReport, MedicalMeasurement } from '../../services/medicalApi';
import { PatientTab } from './PatientShell';

interface HealthTrendsProps {
  onBack: () => void;
  onNavigateTab: (tab: PatientTab) => void;
}

type TrendPoint = {
  id: string;
  parameter_name: string;
  value: string;
  numeric: number;
  unit: string;
  reference_range: string;
  status: string;
  reportDate: string;
  reportDateMs: number;
  reportFilename: string;
};

function parseNumeric(value: string): number | null {
  if (value == null) return null;
  const m = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Parse "13.5 - 17.5", "Below 5.7", "≤ 200", etc. */
function parseReferenceRange(range?: string): { low: number | null; high: number | null } {
  if (!range) return { low: null, high: null };
  const s = range.replace(/,/g, '').trim();
  const between = s.match(/(-?\d+(?:\.\d+)?)\s*[-–—to]+\s*(-?\d+(?:\.\d+)?)/i);
  if (between) {
    return { low: parseFloat(between[1]), high: parseFloat(between[2]) };
  }
  const below = s.match(/(?:below|≤|<=|<)\s*(-?\d+(?:\.\d+)?)/i);
  if (below) return { low: null, high: parseFloat(below[1]) };
  const above = s.match(/(?:above|≥|>=|>)\s*(-?\d+(?:\.\d+)?)/i);
  if (above) return { low: parseFloat(above[1]), high: null };
  return { low: null, high: null };
}

function statusColor(status: string): { fill: string; stroke: string; label: string; badge: string } {
  const s = (status || 'UNKNOWN').toUpperCase();
  if (s === 'CRITICAL') {
    return {
      fill: '#b91c1c',
      stroke: '#fecaca',
      label: 'Critical',
      badge: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  if (s === 'HIGH') {
    return {
      fill: '#c2410c',
      stroke: '#fed7aa',
      label: 'High',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }
  if (s === 'LOW') {
    return {
      fill: '#b45309',
      stroke: '#fde68a',
      label: 'Low',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
    };
  }
  if (s === 'NORMAL') {
    return {
      fill: '#0f766e',
      stroke: '#99f6e4',
      label: 'Normal',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  return {
    fill: '#64748b',
    stroke: '#e2e8f0',
    label: 'Unknown',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function overallStatus(points: TrendPoint[]): string {
  if (!points.length) return 'No data';
  const latest = points[points.length - 1];
  return statusColor(latest.status).label;
}

function buildInsight(points: TrendPoint[]): { title: string; detail: string; tone: 'ok' | 'warn' | 'bad' } {
  if (points.length === 0) {
    return {
      title: 'No measurements yet',
      detail: 'Upload laboratory reports to build a longitudinal trajectory for this parameter.',
      tone: 'ok',
    };
  }
  const latest = points[points.length - 1];
  const st = (latest.status || '').toUpperCase();
  if (points.length >= 2) {
    const prev = points[points.length - 2];
    const delta = latest.numeric - prev.numeric;
    const dir = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
    if (st === 'CRITICAL') {
      return {
        title: 'Critical alert on latest report',
        detail: `${latest.numeric} ${latest.unit} (${latest.reportDate}) is critical vs ${latest.reference_range || 'reference'}. Seek clinical review.`,
        tone: 'bad',
      };
    }
    if (st === 'HIGH' || st === 'LOW') {
      return {
        title: `${st === 'HIGH' ? 'Above' : 'Below'} reference interval`,
        detail: `Latest ${latest.numeric} ${latest.unit} on ${latest.reportDate} is ${st}. Trend is ${dir === 'up' ? 'rising' : dir === 'down' ? 'falling' : 'stable'} vs prior ${prev.numeric}.`,
        tone: 'warn',
      };
    }
    return {
      title: dir === 'flat' ? 'Stable within range' : dir === 'up' ? 'Rising within range' : 'Declining within range',
      detail: `Latest ${latest.numeric} ${latest.unit} (${latest.reportDate}) is NORMAL. Change vs prior: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} ${latest.unit}.`,
      tone: 'ok',
    };
  }
  if (st === 'CRITICAL') {
    return { title: 'Critical on single reading', detail: `Value ${latest.numeric} ${latest.unit} requires attention.`, tone: 'bad' };
  }
  if (st === 'HIGH' || st === 'LOW') {
    return {
      title: `${st} on latest report`,
      detail: `${latest.numeric} ${latest.unit} vs reference ${latest.reference_range || '—'}. Upload more reports for trend.`,
      tone: 'warn',
    };
  }
  return {
    title: 'Within reference interval',
    detail: `Single reading ${latest.numeric} ${latest.unit} on ${latest.reportDate} is within expected bounds.`,
    tone: 'ok',
  };
}

export const HealthTrends: React.FC<HealthTrendsProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    medicalApi
      .listReports('patient-priya-01')
      .then((res) => setReports(Array.isArray(res) ? res : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const allPoints: TrendPoint[] = useMemo(() => {
    const out: TrendPoint[] = [];
    for (const r of reports) {
      const ms = r.created_at ? new Date(r.created_at).getTime() : 0;
      const reportDate = r.created_at
        ? new Date(r.created_at).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—';
      for (const m of r.measurements || []) {
        const numeric = parseNumeric(m.value);
        if (numeric == null) continue;
        out.push({
          id: m.id || `${r.id}-${m.parameter_name}`,
          parameter_name: m.parameter_name,
          value: String(m.value),
          numeric,
          unit: m.unit || '',
          reference_range: m.reference_range || '',
          status: (m.status || 'UNKNOWN').toUpperCase(),
          reportDate,
          reportDateMs: ms,
          reportFilename: r.filename || r.id,
        });
      }
    }
    return out;
  }, [reports]);

  const parameterNames = useMemo(() => {
    const names = Array.from(new Set(allPoints.map((p) => p.parameter_name)));
    // Prefer common clinical order when present
    const preferred = [
      'Hemoglobin',
      'RBC Count',
      'WBC Count',
      'Platelet Count',
      'Hematocrit',
      'MCV',
      'Fasting Blood Glucose',
      'Fasting Glucose',
      'HbA1c',
      'Total Cholesterol',
      'LDL Cholesterol',
      'HDL Cholesterol',
      'Triglycerides',
    ];
    names.sort((a, b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return names;
  }, [allPoints]);

  useEffect(() => {
    if (!selectedParameter && parameterNames.length > 0) {
      setSelectedParameter(parameterNames[0]);
    } else if (selectedParameter && parameterNames.length > 0 && !parameterNames.includes(selectedParameter)) {
      setSelectedParameter(parameterNames[0]);
    }
  }, [parameterNames, selectedParameter]);

  const trendDataPoints = useMemo(() => {
    return allPoints
      .filter((p) => p.parameter_name === selectedParameter)
      .sort((a, b) => a.reportDateMs - b.reportDateMs);
  }, [allPoints, selectedParameter]);

  const refBounds = useMemo(() => {
    const fromPoints = trendDataPoints.map((p) => parseReferenceRange(p.reference_range));
    const lows = fromPoints.map((r) => r.low).filter((n): n is number => n != null);
    const highs = fromPoints.map((r) => r.high).filter((n): n is number => n != null);
    return {
      low: lows.length ? Math.min(...lows) : null,
      high: highs.length ? Math.max(...highs) : null,
    };
  }, [trendDataPoints]);

  const chart = useMemo(() => {
    const W = 600;
    const H = 160;
    const padL = 36;
    const padR = 16;
    const padT = 16;
    const padB = 16;
    const pts = trendDataPoints;
    if (pts.length === 0) return null;

    const values = pts.map((p) => p.numeric);
    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    if (refBounds.low != null) yMin = Math.min(yMin, refBounds.low);
    if (refBounds.high != null) yMax = Math.max(yMax, refBounds.high);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    // padding on value axis
    const span = yMax - yMin;
    yMin -= span * 0.12;
    yMax += span * 0.12;

    const xAt = (i: number) => {
      if (pts.length === 1) return W / 2;
      return padL + (i / (pts.length - 1)) * (W - padL - padR);
    };
    const yAt = (v: number) => {
      const t = (v - yMin) / (yMax - yMin);
      return padT + (1 - t) * (H - padT - padB);
    };

    const lineD = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.numeric).toFixed(1)}`)
      .join(' ');
    const areaD =
      lineD +
      ` L ${xAt(pts.length - 1).toFixed(1)} ${H - padB} L ${xAt(0).toFixed(1)} ${H - padB} Z`;

    let refBand: { y1: number; y2: number } | null = null;
    if (refBounds.low != null && refBounds.high != null) {
      refBand = {
        y1: yAt(refBounds.high),
        y2: yAt(refBounds.low),
      };
    }

    return { W, H, lineD, areaD, xAt, yAt, refBand, yMin, yMax };
  }, [trendDataPoints, refBounds]);

  const insight = buildInsight(trendDataPoints);
  const latest = trendDataPoints[trendDataPoints.length - 1];
  const statusBadge = latest ? statusColor(latest.status) : statusColor('UNKNOWN');

  const alertCount = trendDataPoints.filter((p) =>
    ['HIGH', 'LOW', 'CRITICAL'].includes(p.status)
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wider">
              LONGITUDINAL ANALYTICS
            </span>
            <span className="text-xs text-ink-secondary font-medium">
              From your uploaded lab reports
            </span>
          </div>
          <h2 className="text-2xl font-black text-ink-primary tracking-tight">
            Health Trends & Parameter Tracking
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Trajectories are built from extracted measurements in Medical History. Points are
            coloured by HIGH / LOW / CRITICAL / NORMAL against each report&apos;s reference range.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              window.open('https://www.google.com/maps/search/hospitals+Delhi+NCR+blood+bank/', '_blank')
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-shell-border hover:bg-shell-bg text-ink-primary rounded-xl text-xs font-bold shadow-card transition-all"
          >
            <ExternalLink className="w-4 h-4 text-teal-brand" />
            <span>Hospital Map (Delhi NCR)</span>
          </button>
        </div>
      </div>

      {/* Parameter pills from real data */}
      <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-teal-brand" /> Parameter:
        </span>
        {loading && (
          <span className="text-xs text-ink-secondary font-medium">Loading reports…</span>
        )}
        {!loading && parameterNames.length === 0 && (
          <span className="text-xs text-ink-secondary font-medium">
            No extracted parameters yet — upload a lab report in Medical History.
          </span>
        )}
        {parameterNames.map((param) => {
          const hasAlert = allPoints.some(
            (p) =>
              p.parameter_name === param &&
              ['HIGH', 'LOW', 'CRITICAL'].includes(p.status)
          );
          return (
            <button
              key={param}
              type="button"
              onClick={() => setSelectedParameter(param)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                selectedParameter === param
                  ? 'bg-teal-brand text-white shadow-pill'
                  : 'bg-shell-bg text-ink-primary hover:bg-white hover:shadow-xs border border-shell-border'
              }`}
            >
              {param}
              {hasAlert && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedParameter === param ? 'bg-amber-200' : 'bg-amber-500'
                  }`}
                  title="Has out-of-range values"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-shell-border pb-4">
          <div>
            <h3 className="text-lg font-black text-ink-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-brand" />
              {selectedParameter || 'Parameter'} Trajectory
            </h3>
            <p className="text-xs text-ink-secondary">
              {trendDataPoints.length} reading
              {trendDataPoints.length === 1 ? '' : 's'} from saved laboratory reports
              {alertCount > 0 ? ` · ${alertCount} out-of-range` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {latest && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.badge}`}>
                Latest: {statusBadge.label}
              </span>
            )}
            {alertCount > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {alertCount} alert{alertCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="relative w-full bg-shell-bg rounded-2xl border border-shell-border p-4 min-h-[220px]">
          {!chart ? (
            <div className="h-48 flex items-center justify-center text-xs text-ink-secondary font-medium">
              {loading
                ? 'Loading…'
                : 'No numeric values for this parameter. Upload or select another report parameter.'}
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[10px] font-bold text-ink-secondary mb-1 px-1">
                <span>
                  High
                  {refBounds.high != null ? ` (≥ ${refBounds.high})` : ''}
                </span>
                <span>Reference zone</span>
                <span>
                  Low
                  {refBounds.low != null ? ` (≤ ${refBounds.low})` : ''}
                </span>
              </div>
              <svg
                className="w-full h-44 overflow-visible"
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradientReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chart.refBand && (
                  <rect
                    x={0}
                    y={chart.refBand.y1}
                    width={chart.W}
                    height={Math.max(2, chart.refBand.y2 - chart.refBand.y1)}
                    fill="#10b981"
                    fillOpacity="0.08"
                    stroke="#10b981"
                    strokeOpacity="0.25"
                    strokeDasharray="4 3"
                  />
                )}
                <path d={chart.areaD} fill="url(#chartGradientReal)" />
                <path
                  d={chart.lineD}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trendDataPoints.map((pt, i) => {
                  const c = statusColor(pt.status);
                  const cx = chart.xAt(i);
                  const cy = chart.yAt(pt.numeric);
                  return (
                    <g key={pt.id}>
                      <circle cx={cx} cy={cy} r={8} fill={c.fill} opacity={0.15} />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5.5}
                        fill={c.fill}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        <title>
                          {pt.reportDate}: {pt.numeric} {pt.unit} — {pt.status}
                          {pt.reference_range ? ` (ref ${pt.reference_range})` : ''}
                        </title>
                      </circle>
                    </g>
                  );
                })}
              </svg>
              <div className="flex justify-between items-start gap-1 pt-3 border-t border-shell-border mt-1">
                {trendDataPoints.map((pt) => {
                  const c = statusColor(pt.status);
                  return (
                    <div key={pt.id} className="text-center flex-1 min-w-0 px-0.5">
                      <p className="text-[11px] font-bold text-ink-primary truncate">
                        {pt.numeric} {pt.unit}
                      </p>
                      <p className="text-[10px] text-ink-secondary truncate">{pt.reportDate}</p>
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge}`}
                      >
                        {c.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase">Latest value</p>
            <p className="text-xl font-black text-ink-primary">
              {latest ? (
                <>
                  {latest.numeric}{' '}
                  <span className="text-xs font-normal text-ink-secondary">{latest.unit}</span>
                </>
              ) : (
                '—'
              )}
            </p>
            <p className={`text-[11px] font-semibold ${
              insight.tone === 'bad'
                ? 'text-red-600'
                : insight.tone === 'warn'
                  ? 'text-amber-700'
                  : 'text-emerald-600'
            }`}>
              {latest ? `${statusBadge.label} · ${latest.reportDate}` : 'No data'}
            </p>
          </div>

          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase">Reference interval</p>
            <p className="text-base font-bold text-ink-primary">
              {latest?.reference_range ||
                (refBounds.low != null && refBounds.high != null
                  ? `${refBounds.low} - ${refBounds.high}`
                  : '—')}
            </p>
            <p className="text-[11px] text-ink-secondary">From lab extraction / clinical defaults</p>
          </div>

          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase flex items-center gap-1">
              AI longitudinal insight
              {insight.tone === 'ok' && <Minus className="w-3 h-3 text-teal-brand" />}
              {insight.tone === 'warn' && <TrendingUp className="w-3 h-3 text-amber-600" />}
              {insight.tone === 'bad' && <TrendingDown className="w-3 h-3 text-red-600" />}
            </p>
            <p
              className={`text-xs font-bold ${
                insight.tone === 'bad'
                  ? 'text-red-700'
                  : insight.tone === 'warn'
                    ? 'text-amber-800'
                    : 'text-teal-brand'
              }`}
            >
              {insight.title}
            </p>
            <p className="text-[11px] text-ink-secondary leading-relaxed">{insight.detail}</p>
          </div>
        </div>

        {/* Reading table */}
        {trendDataPoints.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-shell-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-shell-bg/80 text-[10px] font-bold uppercase tracking-wider text-ink-secondary border-b border-shell-border">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Source report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shell-border">
                {[...trendDataPoints].reverse().map((pt) => {
                  const c = statusColor(pt.status);
                  return (
                    <tr key={pt.id} className="hover:bg-shell-bg/40">
                      <td className="py-2.5 px-4 font-semibold text-ink-primary">{pt.reportDate}</td>
                      <td className="py-2.5 px-4 font-bold text-ink-primary">
                        {pt.numeric} {pt.unit}
                      </td>
                      <td className="py-2.5 px-4 text-ink-secondary">{pt.reference_range || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.badge}`}>
                          {c.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-ink-secondary truncate max-w-[200px]">
                        {pt.reportFilename}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
