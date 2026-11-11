import React from 'react';
import { AIPill, SectionLabel } from '@/components/badges';
import { ArrowRight, ArrowDown, Check, GitBranch, Info, AlertTriangle } from 'lucide-react';

// Full cascading projection for a selected replacement candidate. Every bound the candidate
// triggers is listed, with each vacancy created down the line highlighted. This is a what-if
// view only — the approved posting plan is never modified.
export default function CascadeProjectionPanel({ projection, candidateName, onClear }) {
  if (!projection || projection.length === 0) return null;

  const vacancies = projection
    .filter(b => b.vacatedAppointment)
    .map(b => ({
      key: `${b.depth}-${b.vacatedAppointment.id}`,
      depth: b.depth,
      title: b.vacatedAppointment.title,
      poisedOn: b.vacatedAppointment.poisedOn,
      circular: !!b.circularDetected
    }));

  return (
    <div className="rounded-sm border border-primary bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Projected Chain Effect — Full Cascade</h3>
        <AIPill />
        <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-destructive-foreground">
          {vacancies.length} {vacancies.length === 1 ? 'vacancy' : 'vacancies'} triggered down the line
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        What-if projection: selecting <span className="font-medium text-foreground">{candidateName}</span> as replacement. Every appointment
        the move pushes open is highlighted below, in order, until the chain ends. The approved plan is NOT modified.
      </p>

      {/* The cascade drawn as a downward arrow chain: each bound shows the vacancy the move
          creates, and the arrow into the next bound names who steps into it. */}
      <div className="mt-3">
        {projection.map((bound, i) => {
          const next = projection[i + 1];
          const top = bound.replacementOptions?.[0];
          const connectorLabel = !next
            ? null
            : next.selectedCandidateName
              ? `${next.selectedCandidateName}${top && top.personName === next.selectedCandidateName ? ` (${top.satisfactionPct}%)` : ''} steps into this vacancy — their own appointment becomes the next vacancy`
              : 'No replacement is recorded for this vacancy — the chain stops here';
          return (
            <React.Fragment key={i}>
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase text-primary-foreground">Bound {bound.depth + 1}</span>
              {bound.selectedCandidateName && (
                <span className="text-sm font-medium text-foreground">{bound.selectedCandidateName}</span>
              )}
              {bound.vacatedAppointment && (
                <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${
                  bound.circularDetected ? 'bg-amber-50 text-review' : 'bg-destructive text-destructive-foreground'
                }`}>
                  {bound.circularDetected ? 'Circular — no new vacancy' : 'Vacancy created'}
                </span>
              )}
            </div>

            {bound.vacatedAppointment ? (
              <div className={`mt-2 rounded-sm border-l-4 pl-2.5 ${
                bound.circularDetected ? 'border-l-review bg-amber-50/40' : 'border-l-destructive bg-red-50/30'
              }`}>
                <div className="flex items-center gap-2 pt-2 text-xs">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Becomes vacant:</span>
                  <span className="font-medium text-destructive">{bound.vacatedAppointment.title}</span>
                  {bound.circularDetected && <span className="font-semibold text-review">— CIRCULAR DEPENDENCY</span>}
                </div>
                <p className="mt-1 pb-2 text-[0.6875rem] text-muted-foreground">
                  {bound.vacatedAppointment.source}
                  {bound.vacatedAppointment.poisedOn && ` · APPT END ${bound.vacatedAppointment.poisedOn} recorded — this person is already due to move`}
                </p>

                {bound.replacementOptions?.length > 0 && (
                  <div className="pb-2">
                    <SectionLabel>Replacement Options for This Vacancy</SectionLabel>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {bound.replacementOptions.map((opt, j) => (
                        <span
                          key={j}
                          className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.625rem] font-medium ${
                            opt.type === 'primary' ? 'bg-emerald-50 text-ready' : 'bg-amber-50 text-review'
                          }`}
                        >
                          {opt.personName} ({opt.satisfactionPct}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : bound.truncated ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Info className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">{bound.endReason || 'Projection limit reached'}</span>
              </div>
            ) : bound.chainEnds ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Check className="h-3 w-3 text-ready" />
                <span className="text-ready">{bound.endReason || 'Chain ends — no further impact'}</span>
              </div>
            ) : bound.noReplacement ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{bound.endReason || 'No replacement candidates found'}</span>
              </div>
            ) : null}
          </div>
          {connectorLabel && (
            <div className="flex flex-col items-center py-1">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <span className="my-0.5 rounded-sm border border-border bg-card px-2 py-0.5 text-center text-[0.625rem] text-muted-foreground">{connectorLabel}</span>
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-3 text-[0.6875rem] text-muted-foreground">
        The system does NOT recommend the candidate with the fewest posting changes. HR must evaluate trade-offs across all bounds. Anyone already
        placed in this projection is removed from the later vacancy lists, so only the next in line is shown.
      </p>

      {onClear && (
        <div className="mt-2 flex gap-2">
          <button onClick={onClear} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}