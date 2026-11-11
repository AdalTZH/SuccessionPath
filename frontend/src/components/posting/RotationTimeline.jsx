import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MonoValue, AIPill } from '@/components/badges';
import { AlertTriangle, CalendarClock, ChevronRight, Search, UserX } from 'lucide-react';

const FETCH_LIMIT = 300;
const PAGE = 40;
const ROTATION_NORM_YEARS = 4;

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(dateStr) {
  const dt = new Date(dateStr);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// Time in post between two dates, in years and months.
function durationStr(startDate, endDate) {
  if (!startDate) return null;
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  if (isNaN(d1) || isNaN(d2)) return null;
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() < d1.getDate()) months--;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  return { months, label: `${years} yr${years !== 1 ? 's' : ''} ${months % 12} mo` };
}

const BANDS = {
  due: { label: 'Due for rotation (4+ years)', cls: 'border-l-destructive bg-red-50/40', bar: 'bg-destructive', dot: 'bg-destructive' },
  approaching: { label: 'Approaching (3–4 years)', cls: 'border-l-review bg-amber-50/40', bar: 'bg-review', dot: 'bg-review' },
  window: { label: 'In window (under 3 years)', cls: 'border-l-primary bg-primary/5', bar: 'bg-primary', dot: 'bg-primary' }
};

function classifyBand(months) {
  if (months >= ROTATION_NORM_YEARS * 12) return 'due';
  if (months >= (ROTATION_NORM_YEARS - 1) * 12) return 'approaching';
  return 'window';
}

// Rotation exposure is read straight from the imported workbook: the open-ended history row is
// the appointment a person holds today. The workbook records no tour-end dates, so time in post
// is the honest rotation signal.
export default function RotationTimeline({ postingAssignments, onSelectAppointment }) {
  const today = new Date().toISOString().slice(0, 10);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState({ idx: null, month: 0 });
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.entities.AppointmentHistory.filter({ is_current: true }, { sort: 'start_date', limit: FETCH_LIMIT })
      .then(page => { if (!cancelled) setHoldings(page.items || []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const paByLabel = Object.fromEntries((postingAssignments || []).map(pa => [pa.appointment_id, pa]));
    const term = query.trim().toUpperCase();
    return holdings
      .filter(h => h.start_date && h.appointment)
      .filter(h => !term || h.appointment.toUpperCase().includes(term) || (h.employee_name || '').toUpperCase().includes(term))
      .map(h => {
        const tenure = durationStr(h.start_date, today);
        const pa = paByLabel[h.appointment];
        return {
          label: h.appointment,
          holder: h.employee_name,
          employeeId: h.employee_id,
          rank: h.rank,
          startDate: h.start_date,
          months: tenure?.months || 0,
          tenureLabel: tenure?.label || '—',
          band: classifyBand(tenure?.months || 0),
          pa,
          hasSuccessor: !!pa?.primary_candidate_id,
          isReplacement: pa?.status === 'Replacement Required',
          postingOpened: !!pa
        };
      })
      .sort((a, b) => b.months - a.months);
  }, [holdings, postingAssignments, query, today]);

  const summary = useMemo(() => {
    const counts = { due: 0, approaching: 0, window: 0, withoutSuccessor: 0 };
    rows.forEach(r => {
      counts[r.band]++;
      if (r.postingOpened && !r.hasSuccessor) counts.withoutSuccessor++;
    });
    return counts;
  }, [rows]);

  const projectedDate = useMemo(() => addMonths(today, hover.month), [hover.month, today]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-sm border border-border bg-card">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Rotation Timeline — Time in Current Appointment</h3>
          <AIPill />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Due (4+ yrs): <MonoValue>{summary.due}</MonoValue></span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-review" /> Approaching: <MonoValue>{summary.approaching}</MonoValue></span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> In window: <MonoValue>{summary.window}</MonoValue></span>
          <span className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Postings without a successor: <MonoValue>{summary.withoutSuccessor}</MonoValue></span>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
        The imported workbook records no tour-end or vacancy dates. Rotation exposure is therefore shown as time in the current appointment, taken from each person's open-ended appointment record — longest-serving postings first. Bars run to the four-year rotation norm.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="Search appointment or holder…"
            className="w-72 rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.length.toLocaleString()} current holdings in scope · showing {Math.min(limit, rows.length).toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <div className="min-w-[900px]">
          <div className="flex border-b border-border bg-secondary/30">
            <div className="w-80 shrink-0 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Appointment / Current Holder</div>
            <div className="flex-1 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Time in post (to four-year norm)</div>
          </div>

          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No current appointments match “{query}”.</div>
          )}

          {rows.slice(0, limit).map((r, idx) => {
            const band = BANDS[r.band];
            const barWidth = Math.min(r.months / (ROTATION_NORM_YEARS * 12), 1) * 100;
            return (
              <button
                key={`${r.employeeId}-${r.label}-${idx}`}
                onClick={() => onSelectAppointment(r.label)}
                className="group flex w-full items-stretch border-b border-border text-left last:border-0 hover:bg-secondary/30"
              >
                <div className={`w-80 shrink-0 border-l-4 ${band.cls} px-4 py-2.5`}>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-xs font-medium text-foreground">{r.label}</span>
                    {r.isReplacement && <UserX className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.holder} · <MonoValue>{r.employeeId}</MonoValue>{r.rank ? ` · ${r.rank}` : ''}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${band.dot}`} />
                    <span className="text-[0.625rem] text-muted-foreground">
                      In post since <MonoValue>{fmtDate(r.startDate)}</MonoValue> · <MonoValue>{r.tenureLabel}</MonoValue>
                    </span>
                  </div>
                </div>

                <div
                  className="relative flex-1 py-2.5"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setHover({ idx, month: Math.round(xPct * 24) });
                  }}
                  onMouseLeave={() => setHover({ idx: null, month: 0 })}
                >
                  {hover.idx === idx && (
                    <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/40" style={{ left: `${(hover.month / 24) * 100}%` }} />
                  )}
                  {hover.idx === idx && (
                    <div
                      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-sm border border-border bg-card px-2 py-1.5 text-[0.625rem] shadow-lg whitespace-nowrap"
                      style={{ left: `${Math.min(Math.max((hover.month / 24) * 100, 8), 88)}%`, top: 0 }}
                    >
                      <div className="font-semibold text-foreground">
                        {r.holder} — {durationStr(r.startDate, projectedDate)?.label || '—'} in post
                      </div>
                      <div className="text-muted-foreground">Projected at {monthLabel(projectedDate)}</div>
                      <div className="text-muted-foreground">In role since {fmtDate(r.startDate)}</div>
                    </div>
                  )}

                  <div className="relative h-full min-h-[2.5rem]">
                    <div className="absolute inset-0 flex">
                      {[0, 1, 2, 3].map(i => <div key={i} className="flex-1 border-l border-border/40" />)}
                    </div>
                    <div
                      className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-sm opacity-80 ${band.bar}`}
                      style={{ left: '0%', width: `${barWidth}%` }}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${barWidth}% - 6px)` }}>
                      <div className={`flex h-3 w-3 items-center justify-center rounded-full border-2 border-card ${band.dot}`} />
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${barWidth}% + 10px)` }}>
                      {r.isReplacement ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-destructive">
                          <UserX className="h-2.5 w-2.5" /> Replacement Required
                        </span>
                      ) : r.hasSuccessor ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-ready">
                          Successor: {r.pa.primary_candidate_name}
                        </span>
                      ) : r.postingOpened ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-review">
                          <AlertTriangle className="h-2.5 w-2.5" /> Posting open — no successor
                        </span>
                      ) : (
                        <span className="text-[0.625rem] text-muted-foreground">No posting opened</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {rows.length > limit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit(l => l + PAGE)}
            className="rounded-sm border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Show {Math.min(PAGE, rows.length - limit)} more — {(rows.length - limit).toLocaleString()} remaining
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-sm border border-border bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Legend:</span>
        <span>Bars show time the current holder has been in post against a four-year rotation norm.</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-destructive/80" /> Due for rotation</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-review/80" /> Approaching</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-primary/80" /> In window</span>
        <span className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3" /> Click a row to open candidate matching for that appointment</span>
      </div>
    </div>
  );
}