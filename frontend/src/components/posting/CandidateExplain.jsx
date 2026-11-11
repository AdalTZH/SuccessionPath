import React from 'react';
import { PROFICIENCY, READINESS } from '@/lib/postingEngine';
import { useNavigate } from 'react-router-dom';
import { MonoValue, AIPill, ReadyPill, ReviewPill } from '@/components/badges';
import { tabForText, profileTabPath, reviewFocus } from '@/lib/reviewTabs';
import { Check, X, AlertTriangle, GraduationCap } from 'lucide-react';

const STATUS_CONFIG = {
  Eligible: { icon: Check, cls: 'text-ready', pill: <ReadyPill>Eligible</ReadyPill> },
  'Review Required': { icon: AlertTriangle, cls: 'text-review', pill: <ReviewPill>Review Required</ReviewPill> },
  Excluded: { icon: X, cls: 'text-destructive', pill: <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-destructive"><span className="h-1 w-1 rounded-full bg-destructive" />Excluded</span> }
};

const GAP_TYPE_LABELS = {
  'mandatory-fail': { label: 'Fails mandatory minimum', cls: 'text-destructive' },
  'missing-mandatory': { label: 'Missing data — mandatory', cls: 'text-review' },
  'development-gap': { label: 'Development gap', cls: 'text-review' },
  'missing-soft': { label: 'Missing data — desirable', cls: 'text-muted-foreground' },
  'none': { label: 'Met', cls: 'text-ready' }
};

// Per-candidate explainability: component breakdown + criterion checks + skills gap + development recommendations.
export default function CandidateExplain({ result, person }) {
  const navigate = useNavigate();
  const { checks, status, readiness, skillsGap, developmentOptions, components } = result;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Review Required'];
  // A Review Required candidate is missing data HR must verify — open the tab that holds it.
  const reviewCheck = (checks || []).find(c => c.status === 'review');
  const reviewTab = tabForText(reviewCheck?.criterion || reviewCheck?.priority);
  const statusPill = status === 'Review Required'
    ? <ReviewPill onClick={() => navigate(profileTabPath(person.employee_id, reviewTab, reviewFocus(result, reviewCheck?.detail || status)))} title={`Open ${person.name}'s profile at the tab that holds this data`}>Review Required</ReviewPill>
    : cfg.pill;

  return (
    <div className="rounded-sm border border-border bg-card">
      {/* Header with readiness status */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{person.name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{person.employee_id} · {person.rank} · {person.vocation}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusPill}
          <span className={`text-xs font-semibold ${READINESS[readiness]?.cls || 'text-foreground'}`}>{readiness}</span>
        </div>
      </div>

      {/* Component breakdown (Rule 10: no opaque score) */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Assessment Breakdown</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Criteria Satisfied</span>
            <p className={`text-xs font-medium ${components.satisfaction?.met ? 'text-ready' : 'text-destructive'}`}>{components.satisfaction?.label || '—'}</p>
          </div>
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Eligibility</span>
            <p className="text-xs font-medium text-foreground">{components.eligibility.label}</p>
          </div>
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Skills</span>
            <p className="text-xs font-medium text-foreground">{components.skills.label}</p>
          </div>
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Availability</span>
            <p className="text-xs font-medium text-foreground">{components.availability.label}</p>
          </div>
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Preference</span>
            <p className="text-xs font-medium text-foreground">{components.preference.label}</p>
          </div>
          <div>
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Development</span>
            <p className="text-xs font-medium text-foreground">{components.development.label}</p>
          </div>
        </div>
      </div>

      {/* Criterion checks */}
      <div className="px-4 py-3">
        <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Criterion Checks — Why included or excluded</p>
        <div className="space-y-1.5">
          {checks.map((c, i) => {
            const icon = c.status === 'pass' ? <Check className="h-3.5 w-3.5 text-ready" /> : c.status === 'fail' ? <X className="h-3.5 w-3.5 text-destructive" /> : <AlertTriangle className="h-3.5 w-3.5 text-review" />;
            const label = c.type === 'hard' ? `${c.criterion} (Mandatory)` : `${c.criterion} (Desirable)`;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <div>
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="ml-1.5 text-muted-foreground">— {c.detail}</span>
                  {c.priority && <span className="ml-1.5 rounded-sm bg-secondary px-1 py-0.5 text-[0.5625rem] uppercase tracking-wide text-muted-foreground">{c.priority}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills gap analysis (Rule 11: mandatory minimum vs desired) */}
      {skillsGap.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Skills Gap Analysis</p>
            <AIPill />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Skill</th>
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Min</th>
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Desired</th>
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Current</th>
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Gap</th>
                  <th className="py-1.5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {skillsGap.map((g, i) => {
                  const gt = GAP_TYPE_LABELS[g.gapType] || GAP_TYPE_LABELS['none'];
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-3 font-medium text-foreground">{g.skill}</td>
                      <td className="py-1.5 pr-3"><MonoValue>{g.required}</MonoValue> <span className="text-muted-foreground">{PROFICIENCY[g.required]}</span></td>
                      <td className="py-1.5 pr-3"><MonoValue>{g.desired}</MonoValue> <span className="text-muted-foreground">{PROFICIENCY[g.desired]}</span></td>
                      <td className="py-1.5 pr-3">
                        {g.individual > 0
                          ? <><MonoValue>{g.individual}</MonoValue> <span className="text-muted-foreground">{PROFICIENCY[g.individual]}</span></>
                          : <span className="text-muted-foreground">Not recorded</span>}
                      </td>
                      <td className="py-1.5 pr-3">
                        {g.gap > 0
                          ? <span className="font-mono font-semibold text-review">-{g.gap}</span>
                          : <span className="font-mono font-semibold text-ready">✓</span>}
                      </td>
                      <td className={`py-1.5 text-[0.625rem] font-semibold uppercase ${gt.cls}`}>{gt.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Development recommendations (Rule 15: gap → course/intervention) */}
      {developmentOptions.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Development Recommendations</p>
            <AIPill />
          </div>
          <div className="space-y-2">
            {developmentOptions.map((d, i) => (
              <div key={i} className="rounded-sm border border-border bg-secondary/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{d.skill}</span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    <MonoValue>{d.current || 0}</MonoValue> → <MonoValue>{d.desired}</MonoValue> (gap {d.gap})
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground">{d.recommendation}</p>
                {d.relatedCourses.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.relatedCourses.map(c => (
                      <span key={c} className="rounded-sm bg-ai-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-ai">{c}</span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[0.625rem] text-muted-foreground">
                  Course completion = evidence of development, not automatic proficiency (Rule 13). Skill validation requires demonstrated application.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness rationale */}
      <div className="border-t border-border px-4 py-2.5">
        <p className="text-[0.6875rem] text-muted-foreground">
          {readiness === 'Ready' && 'All mandatory requirements met and no material readiness gaps identified.'}
          {readiness === 'Ready with Development' && 'All mandatory eligibility requirements met. Developmental skill gaps identified — ready with development intervention.'}
          {readiness === 'Longer-term Candidate' && 'Plausible future fit but requires substantial development (2+ proficiency levels) before appointment.'}
          {readiness === 'Review Required' && 'Missing information or unverified data — HR review required before eligibility can be confirmed.'}
          {readiness === 'Not Eligible' && `Below 60% eligibility threshold (${components.satisfaction?.pct || 0}% criteria met) — excluded. HR may override with justification.`}
        </p>
      </div>
    </div>
  );
}