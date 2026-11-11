import React from 'react';
import { MonoValue, SectionLabel } from '@/components/badges';
import { pct } from '@/lib/pathwayHistoryEngine';

export default function HistoryCandidateCard({ role, candidate }) {
  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{role}</SectionLabel>
        {candidate && <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-ai">History-derived</span>}
      </div>

      {!candidate ? (
        <p className="mt-1.5 text-sm text-muted-foreground">No recorded candidate for this slot.</p>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-foreground">{candidate.person.name}</span>
            <MonoValue className="text-[0.625rem]">{candidate.employee_id}</MonoValue>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {candidate.person.rank || 'Rank not recorded'} · currently {candidate.person.current_appointment || 'no recorded appointment'}
          </p>

          <div className="mt-2 space-y-1.5">
            {candidate.routes.slice(0, 2).map((r, i) => (
              <p key={i} className="text-xs text-foreground">
                Arrived via <span className="font-medium">{r.label}</span> — <MonoValue className="text-xs">{r.count}</MonoValue> recorded
                move(s) into this appointment ({pct(r.share)} of arrivals). Held{' '}
                <MonoValue className="text-xs">{r.start_date || '—'}</MonoValue> → <MonoValue className="text-xs">{r.end_date || (r.is_open_ended ? 'Current' : '—')}</MonoValue>
              </p>
            ))}
            {candidate.routes.length > 2 && (
              <p className="text-[0.6875rem] text-muted-foreground">Held {candidate.routes.length} observed feeder appointments in total.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}