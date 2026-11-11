import React from 'react';
import { Link } from 'react-router-dom';
import { AIPill, MonoValue, SectionLabel } from '@/components/badges';
import { tenureLabel } from '@/lib/pathwayHistoryEngine';
import ProgressionPatterns from '@/components/appointments/ProgressionPatterns';
import IncumbentLine from '@/components/appointments/IncumbentLine';
import { ChevronRight } from 'lucide-react';

function Metric({ label, value, mono }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-0.5 text-sm text-foreground">{mono ? <MonoValue>{value ?? '—'}</MonoValue> : (value ?? 0).toLocaleString()}</p>
    </div>
  );
}

export default function AppointmentCatalogueCard({ entry, pathway, incumbents = [] }) {
  const holders = entry.current_holders || 0;
  return (
    <div className="flex flex-col rounded-sm border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-mono text-sm font-semibold text-foreground">{entry.label}</h3>
          <IncumbentLine people={incumbents} />
        </div>
        <span className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review">
          {entry.validation_status || 'Unvalidated'}
        </span>
      </div>

      {(entry.grooming_tier || entry.speciality) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" title={[entry.tier_basis, entry.speciality_evidence].filter(Boolean).join(' · ')}>
          {entry.grooming_tier && (
            <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${
              entry.grooming_tier === 'P1' ? 'bg-primary text-primary-foreground' : 'border border-primary bg-primary/10 text-primary'
            }`}>
              Grooming {entry.grooming_tier}
            </span>
          )}
          {entry.speciality && (
            <span className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {entry.speciality}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2.5 border-t border-border pt-3">
        <Metric label="Recorded Holdings" value={entry.usage_count} />
        <Metric label="Personnel" value={entry.distinct_employees} />
        <Metric label="Current Holders" value={holders} />
        <Metric label="First Recorded" value={entry.first_start_date} mono />
        <Metric label="Latest Recorded" value={entry.latest_start_date} mono />
        <Metric label="Median Tenure" value={pathway ? tenureLabel(pathway.median_tenure_months) : '—'} mono />
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <SectionLabel>Observed Progression</SectionLabel>
          <AIPill />
        </div>
        <ProgressionPatterns title="Arrived from" entries={(pathway?.typical_predecessors || []).slice(0, 3)} emptyText="No arrivals recorded" />
        <ProgressionPatterns title="Moved on to" entries={(pathway?.typical_successors || []).slice(0, 3)} emptyText="No onward moves recorded" />
        <p className="text-[0.625rem] text-muted-foreground">
          {pathway?.transition_sample_size
            ? `${pathway.transition_sample_size.toLocaleString()} recorded transitions · indicative of this population only`
            : 'No transitions recorded for this appointment'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-[0.625rem] text-muted-foreground">
          {holders > 0 ? `${holders} personnel currently hold this label` : 'No open-ended holding recorded'}
        </span>
        <Link
          to={`/pathway-explorer?label=${encodeURIComponent(entry.label)}`}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          View holders & linkage <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}