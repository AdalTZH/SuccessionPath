import React from 'react';
import { AIPill, ReviewPill, StatusBadge } from '@/components/badges';
import { formatVocations } from '@/lib/postingEngine';

export default function AppointmentBasisPanel({ label, basis, requirement }) {
  const pathway = basis.pathway;
  const total = basis.ranks.reduce((sum, r) => sum + r.count, 0);
  return (
    <div className="mb-4 rounded-sm border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-mono text-base font-semibold text-foreground">{label}</h2>
            <StatusBadge status="Open" />
            <ReviewPill>Basis derived from recorded history</ReviewPill>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Appointment column preserved verbatim from the source workbook · {pathway?.total_holdings ?? total} recorded holdings · {pathway?.distinct_holders ?? 0} personnel · {pathway?.current_holders ?? 0} current holders · vacancy window not recorded in source
          </p>
        </div>
        <AIPill />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Rank Basis (observed)</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {basis.ranks.length === 0 && <span className="text-xs text-muted-foreground">No rank recorded in the source</span>}
            {basis.ranks.map((r, i) => (
              <span
                key={r.value}
                className={`rounded-sm border px-1.5 py-0.5 font-mono text-[0.625rem] ${i === 0 ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border text-muted-foreground'}`}
              >
                {r.value} · {r.count}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[0.625rem] text-muted-foreground">
            Rank held by recorded holders. The most common rank is applied as the eligibility basis; every other recorded rank is shown for HR judgement.
          </p>
        </div>
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Vocation Basis (observed)</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {basis.vocations.length === 0 && <span className="text-xs text-muted-foreground">No vocation recorded in the source</span>}
            {basis.vocations.slice(0, 6).map(v => (
              <span key={v.value} className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">{v.value} · {v.count}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[0.625rem] text-muted-foreground">
            Accepted for matching: <span className="font-mono text-foreground">{formatVocations(requirement.vocation_requirement)}</span> — vocations covering at least 10% of recorded holdings.
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-2.5 text-[0.625rem] text-muted-foreground">
        The workbook records no qualification, course or skill requirements for this appointment, so eligibility rests on the observed rank and vocation above. Posting availability is not part of the appointment history import — where it is absent the feasibility step flags the candidate for HR review rather than excluding them. Suitability and development judgement remain with HR.
      </p>
    </div>
  );
}