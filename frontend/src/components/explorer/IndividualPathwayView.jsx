import React from 'react';
import { MonoValue, SectionLabel, ReviewPill } from '@/components/badges';
import { sortHistory, tenureLabel, rowTenureMonths } from '@/lib/pathwayHistoryEngine';

export default function IndividualPathwayView({ history = [], onSelectAppointment }) {
  const rows = sortHistory(history);
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No appointment history recorded for this individual in the migrated source.</p>;
  }

  const totalMonths = rows.reduce((s, r) => s + (rowTenureMonths(r) || 0), 0);
  const current = rows.find(r => r.is_current);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <SectionLabel>First Recorded</SectionLabel>
          <div className="mt-0.5 text-sm text-foreground">{rows[0].appointment}</div>
          <div className="font-mono text-[0.6875rem] text-muted-foreground">{rows[0].start_date}</div>
        </div>
        <div>
          <SectionLabel>Current Appointment</SectionLabel>
          <div className="mt-0.5 text-sm text-foreground">{current?.appointment || '—'}</div>
          <div className="font-mono text-[0.6875rem] text-muted-foreground">{current?.start_date || 'no open-ended record'}</div>
        </div>
        <div>
          <SectionLabel>Appointments Held</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{rows.length}</MonoValue></div>
        </div>
        <div>
          <SectionLabel>Total Recorded Tenure</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{tenureLabel(totalMonths)}</MonoValue></div>
        </div>
      </div>

      <ol className="relative space-y-0">
        {rows.map((r, i) => (
          <li key={r.id || i} className="relative flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.is_current ? 'bg-primary' : 'bg-border'}`} />
              {i < rows.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={`mb-2 flex-1 rounded-sm border p-2.5 ${r.is_current ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAppointment?.(r.appointment)}
                  className="text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {r.appointment}
                </button>
                <span className="flex items-center gap-2">
                  {r.is_current && <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground">Current</span>}
                  <MonoValue className="text-[0.6875rem] text-muted-foreground">{tenureLabel(rowTenureMonths(r))}</MonoValue>
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                {r.start_date || '—'} → {r.end_date || (r.is_open_ended ? 'Current / Ongoing' : '—')}
                {r.rank ? ` · ${r.rank}` : ''}{r.vocation ? ` · ${r.vocation}` : ''}
              </div>
              {(r.data_quality_flags || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.data_quality_flags.map((f, j) => <ReviewPill key={j}>{f}</ReviewPill>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
        Source: AppointmentHistory_Redacted. Periods shown exactly as recorded in the source workbook — overlapping periods are flagged, never corrected.
      </p>
    </div>
  );
}