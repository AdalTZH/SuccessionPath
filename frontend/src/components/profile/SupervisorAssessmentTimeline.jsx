import React from 'react';
import { AIPill, ReviewPill, MonoValue, SectionLabel, RatingBadge } from '@/components/badges';

// A grade imported from the planning workbook names no assessing supervisor, so the record
// is labelled as such and never presented as a verification.
const SUPERVISOR_NOT_RECORDED = 'Not recorded in source workbook';

function AssessmentCard({ a, isLatest }) {
  return (
    <div className={`rounded-sm border p-3 ${isLatest ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">{a.assessment_period}</span>
          {isLatest && <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground">Latest</span>}
          {a.supervisor_name && a.supervisor_name !== SUPERVISOR_NOT_RECORDED && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ready">
              <span className="h-1 w-1 rounded-full bg-ready" />
              Verified by {a.supervisor_name}{a.supervisor_appointment ? `, ${a.supervisor_appointment}` : ''}
            </span>
          )}
        </div>
        <span className="text-[0.625rem] text-muted-foreground">{a.assessment_date}</span>
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">
        Supervisor: <span className="text-foreground">{a.supervisor_name}</span> ({a.supervisor_appointment || '—'})
        {' · '}Individual's Appt: <span className="text-foreground">{a.individual_appointment || '—'}</span>
      </div>
      {a.overall_assessment && <p className="mt-2 text-sm text-foreground">{a.overall_assessment}</p>}
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {a.key_strengths?.length > 0 && (
          <div>
            <SectionLabel>Key Strengths</SectionLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {a.key_strengths.map((s, i) => (
                <span key={i} className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-ready">{s}</span>
              ))}
            </div>
          </div>
        )}
        {a.development_areas?.length > 0 && (
          <div>
            <SectionLabel>Development Areas</SectionLabel>
            <div className="mt-1 flex flex-wrap gap-1">
              {a.development_areas.map((d, i) => (
                <span key={i} className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-review">{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {a.attributes_observed?.length > 0 && (
        <div className="mt-2">
          <SectionLabel>Attributes Observed</SectionLabel>
          <div className="mt-1 space-y-0.5">
            {a.attributes_observed.map((at, i) => (
              <div key={i} className="text-xs text-foreground"><span className="font-medium">{at.attribute}:</span> {at.observation}</div>
            ))}
          </div>
        </div>
      )}
      {a.skills_demonstrated?.length > 0 && (
        <div className="mt-2">
          <SectionLabel>Skills Demonstrated</SectionLabel>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {a.skills_demonstrated.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[0.625rem]">
                {s.skill} <RatingBadge rating={s.level} />
              </span>
            ))}
          </div>
        </div>
      )}
      {a.career_recommendation && (
        <div className="mt-2">
          <SectionLabel>Career Recommendation</SectionLabel>
          <p className="mt-0.5 text-xs text-foreground">{a.career_recommendation}</p>
        </div>
      )}
      {a.supervisor_narrative && (
        <div className="mt-2">
          <SectionLabel>Supervisor Narrative</SectionLabel>
          <p className="mt-0.5 text-xs text-foreground">{a.supervisor_narrative}</p>
        </div>
      )}
      {a.supporting_evidence && (
        <div className="mt-2">
          <SectionLabel>Supporting Evidence</SectionLabel>
          <p className="mt-0.5 text-xs text-muted-foreground">{a.supporting_evidence}</p>
        </div>
      )}
    </div>
  );
}

export default function SupervisorAssessmentTimeline({ assessments = [] }) {
  if (!assessments.length) return <p className="text-sm text-muted-foreground">No supervisor assessments recorded.</p>;
  const sorted = [...assessments].sort((a, b) => (a.assessment_period || '').localeCompare(b.assessment_period || ''));
  const latest = sorted[sorted.length - 1];

  // Build longitudinal synthesis
  const allStrengths = {};
  const allDevAreas = {};
  sorted.forEach(a => {
    (a.key_strengths || []).forEach(s => { allStrengths[s] = (allStrengths[s] || 0) + 1; });
    (a.development_areas || []).forEach(d => { allDevAreas[d] = (allDevAreas[d] || 0) + 1; });
  });
  const recurringStrengths = Object.entries(allStrengths).filter(([_, c]) => c >= 2).map(([s]) => s);
  const recurringDevAreas = Object.entries(allDevAreas).filter(([_, c]) => c >= 2).map(([d]) => d);
  const latestStrengths = latest.key_strengths || [];
  const latestDevAreas = latest.development_areas || [];
  const newConcerns = latestDevAreas.filter(d => recurringStrengths.includes(d));

  return (
    <div className="space-y-4">
      {/* Longitudinal synthesis */}
      <div className="rounded-sm border border-ai/30 bg-ai-soft p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Longitudinal Assessment Synthesis</h3>
          <AIPill />
        </div>
        <p className="mt-1 text-[0.625rem] uppercase tracking-wide text-muted-foreground">AI-generated synthesis — not a substitute for HR review of source assessments.</p>
        <div className="mt-2 space-y-1.5 text-sm text-foreground">
          <p>Assessments across <MonoValue>{sorted.length}</MonoValue> period(s): <MonoValue>{sorted.map(a => a.assessment_period).join(' → ')}</MonoValue></p>
          {recurringStrengths.length > 0 && (
            <p><span className="font-medium">Recurring strengths</span> (identified by 2+ supervisors): {recurringStrengths.join(', ')}</p>
          )}
          {recurringDevAreas.length > 0 && (
            <p><span className="font-medium">Recurring development areas</span> (identified by 2+ supervisors): {recurringDevAreas.join(', ')}</p>
          )}
          {newConcerns.length > 0 && (
            <div className="flex items-start gap-2 rounded-sm bg-amber-50 p-2">
              <ReviewPill>Change Detected</ReviewPill>
              <p className="text-xs text-foreground">
                <span className="font-medium">{newConcerns.join(', ')}</span> has historically been assessed as a strength but is flagged as a development area in the latest assessment — representing a change from the previous pattern and potentially warranting HR review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Latest assessment highlight */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Latest Supervisor Assessment</h3>
        <AssessmentCard a={latest} isLatest={true} />
      </div>

      {/* Full timeline */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Assessment Timeline</h3>
        <div className="space-y-2">
          {sorted.map((a, i) => (
            <AssessmentCard key={a.id || i} a={a} isLatest={i === sorted.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}