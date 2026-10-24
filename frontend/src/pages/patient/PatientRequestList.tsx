import React, { useState } from 'react';
import {
  Clock,
  Search,
  Navigation,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PatientRequestListProps {
  onTrackRequest: (id: string) => void;
  onNewRequest: () => void;
}

export const PatientRequestList: React.FC<PatientRequestListProps> = ({
  onTrackRequest,
  onNewRequest,
}) => {
  const { patientRequests } = useAuth();
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRequests = patientRequests.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(search.toLowerCase()) ||
      req.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      req.blood_group.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            My Blood Requests
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
            Active and fulfilled emergency blood requirements associated with your private demo session.
          </p>
        </div>

        <button
          onClick={onNewRequest}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs md:text-sm font-bold shadow-pill transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Blood Request</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-shell-border shadow-card">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Request ID, hospital, blood group..."
            className="w-full pl-9 pr-4 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'DISPATCHED', 'PLANNED', 'FULFILLED', 'PENDING'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-teal-brand text-white shadow-xs'
                  : 'bg-shell-bg text-ink-secondary hover:text-ink-primary hover:bg-shell-card-subtle'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 border border-shell-border shadow-card hover:border-teal-brand/30 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="px-3 py-1.5 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-xl font-mono font-extrabold text-base">
                    {req.blood_group}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-ink-primary">
                        {req.hospital_name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-ink-secondary bg-shell-bg px-2 py-0.5 rounded border border-shell-border">
                        {req.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.urgency === 'CRITICAL'
                            ? 'bg-pastel-rose-bg text-crimson border border-pastel-rose-border'
                            : 'bg-pastel-lavender-bg text-pastel-lavender-text border border-pastel-lavender-border'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary mt-1.5">
                      <span>
                        Component: <strong className="text-ink-primary">{req.component_type}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Units: <strong className="text-ink-primary">{req.units_requested}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Source: <strong className="text-ink-primary">{req.source_facility || 'Rotary Hub'}</strong>
                      </span>
                      <span>•</span>
                      <span>Requested: {req.created_at}</span>
                    </div>

                    {req.clinical_notes && (
                      <p className="text-xs text-ink-secondary/80 mt-1 italic">
                        "{req.clinical_notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.status === 'DISPATCHED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : req.status === 'FULFILLED'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="block text-xs font-mono font-bold text-teal-brand mt-0.5">
                      ETA ~{req.actual_eta_mins || req.max_eta_minutes} mins
                    </span>
                  </div>

                  <button
                    onClick={() => onTrackRequest(req.id)}
                    className="px-4 py-2 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill flex items-center gap-1.5 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Live</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-shell-border shadow-card">
          <Clock className="w-10 h-10 text-ink-secondary/50 mx-auto mb-2" />
          <h3 className="text-base font-bold text-ink-primary">No Requests Found</h3>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto mt-1">
            {search || statusFilter !== 'ALL'
              ? 'No requests match your search criteria. Clear filters to see all.'
              : 'You have not submitted any emergency blood requests yet.'}
          </p>
          <button
            onClick={onNewRequest}
            className="mt-4 px-4 py-2 bg-teal-brand text-white rounded-xl text-xs font-bold shadow-pill hover:bg-teal-brand-hover transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Emergency Request</span>
          </button>
        </div>
      )}
    </div>
  );
};
