import React from 'react';
import { RatingBadge, StatusBadge, AIPill, ReviewPill, MonoValue, SectionLabel } from '@/components/badges';
import AspirationEditor from '@/components/profile/AspirationEditor';
import PostingAvailabilityEditor from '@/components/profile/PostingAvailabilityEditor';
import RecordVerification from '@/components/profile/RecordVerification';
import RecordDevelopmentReview from '@/components/profile/RecordDevelopmentReview';

const PROFICIENCY = { 1: 'Awareness', 2: 'Working', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

export function Section({ title, subtitle, action, children, highlight = false }) {
  return (
    <section
      data-review-focus={highlight ? 'true' : undefined}
      className={`rounded-sm border bg-card ${highlight ? 'border-review ring-2 ring-review/40' : 'border-border'}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function BasicInfo({ e }) {
  const items = [
    ['Employee ID', <MonoValue key="id">{e.employee_id}</MonoValue>],
    ['Rank / Grade', <MonoValue key="r">{e.rank}</MonoValue>],
    ['Vocation / Community', e.vocation],
    ['Organisation', e.organisation],
    ['Department / Formation', e.department],
    ['Current Appointment', e.current_appointment],
    ['Appointment Start', e.appointment_start_date],
    ['Years in Service', <MonoValue key="ys">{e.years_in_service ?? '—'}</MonoValue>],
    ['Years in Rank', <MonoValue key="yr">{e.years_in_rank}</MonoValue>],
    ['Years in Appointment', <MonoValue key="ya">{e.years_in_appointment}</MonoValue>]
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <SectionLabel>{label}</SectionLabel>
          <div className="mt-0.5 text-sm text-foreground">{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

export function CareerHistory({ items = [] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No career history recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Appointment</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Organisation</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Responsibilities</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Experience Gained</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Tags</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 font-medium text-foreground">{h.appointment}</td>
              <td className="py-2 pr-4 text-foreground">{h.organisation}</td>
              <td className="py-2 pr-4"><MonoValue>{h.duration || '—'}</MonoValue></td>
              <td className="py-2 pr-4 text-foreground">{h.appointment_type || '—'}</td>
              <td className="py-2 pr-4 text-foreground">{h.responsibilities}</td>
              <td className="py-2 pr-4 text-foreground">{h.experience_gained}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1">
                  {(h.experience_tags || []).map((t, j) => (
                    <span key={j} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{t}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skills({ items = [], employee, onSaved }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No skills recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Skill</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Proficiency</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Supporting Evidence</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Last Validated</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Verification</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 font-medium text-foreground">{s.skill}</td>
              <td className="py-2 pr-4"><MonoValue>{s.proficiency}</MonoValue> <span className="text-xs text-muted-foreground">{PROFICIENCY[s.proficiency]}</span></td>
              <td className="py-2 pr-4 text-foreground">{s.evidence}</td>
              <td className="py-2 pr-4 text-foreground">{s.evidence_source}</td>
              <td className="py-2 pr-4"><MonoValue>{s.last_validated}</MonoValue></td>
              <td className="py-2">
                {employee
                  ? <RecordVerification employee={employee} item={s} index={i} kind="skill" onSaved={onSaved} />
                  : (s.verification_status === 'Verified'
                    ? <span className="text-xs font-medium text-ready">Verified by {s.verified_by || '—'}{s.verified_by_appointment ? `, ${s.verified_by_appointment}` : ''}</span>
                    : <span className="text-xs font-medium text-review">Pending</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Qualifications({ items = [], employee, onSaved }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No qualifications recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Qualification</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Sponsorship</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Verification</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 font-medium text-foreground">{q.qualification}</td>
              <td className="py-2 pr-4 text-foreground">{q.provider}</td>
              <td className="py-2 pr-4"><MonoValue>{q.date}</MonoValue></td>
              <td className="py-2 pr-4"><MonoValue>{q.expiry || '—'}</MonoValue></td>
              <td className="py-2 pr-4 text-foreground">{q.sponsorship}</td>
              <td className="py-2">
                {employee
                  ? <RecordVerification employee={employee} item={q} index={i} kind="qualification" onSaved={onSaved} />
                  : (q.verification_status === 'Verified'
                    ? <span className="text-xs font-medium text-ready">Verified by {q.verified_by || '—'}{q.verified_by_appointment ? `, ${q.verified_by_appointment}` : ''}</span>
                    : <span className="text-xs font-medium text-review">Pending</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Aspirations({ data, employee, onSaved }) {
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        No career aspirations captured.{' '}
        <AspirationEditor
          employee={employee}
          onSaved={onSaved}
          renderTrigger={({ open }) => <ReviewPill onClick={open} title="Key in this individual's career aspirations">Review Required</ReviewPill>}
        />
      </p>
    );
  }
  const prefs = data.preferred_appointments || [];
  const pref1 = data.preferred_appointment_1;
  const pref2 = data.preferred_appointment_2;
  const pref3 = data.preferred_appointment_3;
  const hasStructuredPrefs = pref1 || pref2 || pref3;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <SectionLabel>Career Aspiration</SectionLabel>
          <p className="mt-0.5 text-sm text-foreground">{data.interests || '—'}</p>
          <div className="mt-3"><SectionLabel>Preferred Career / Functional Area</SectionLabel>
            <p className="mt-0.5 text-sm text-foreground">{data.preferred_career_area || '—'}</p>
          </div>
          <div className="mt-3"><SectionLabel>Development Interests</SectionLabel>
            <p className="mt-0.5 text-sm text-foreground">{data.development_interests || '—'}</p>
          </div>
        </div>
        <div>
          <SectionLabel>Preferred Future Appointments</SectionLabel>
          {hasStructuredPrefs ? (
            <ol className="mt-1 space-y-1">
              {[pref1, pref2, pref3].filter(Boolean).map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary font-mono text-xs font-semibold text-foreground">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
          ) : prefs.length > 0 ? (
            <ol className="mt-1 space-y-1">
              {prefs.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary font-mono text-xs font-semibold text-foreground">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Not expressed</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2">
        <div>
          <SectionLabel>Mobility / Posting Considerations</SectionLabel>
          <p className="mt-0.5 text-sm text-foreground">{data.mobility_considerations || '—'}</p>
        </div>
        <div>
          <SectionLabel>Last Updated</SectionLabel>
          <p className="mt-0.5 text-sm"><MonoValue>{data.last_updated || '—'}</MonoValue></p>
        </div>
      </div>
      <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Aspiration is one input to posting decisions — it is not a mandatory rule and does not guarantee assignment.</p>
      {employee && (
        <div className="flex justify-end border-t border-border pt-3">
          <AspirationEditor employee={employee} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}

export function AssessmentHistory({ assessments, type }) {
  const rows = assessments.filter(a => a.type === type).sort((a, b) => (b.period || '').localeCompare(a.period || ''));
  if (!rows.length) return <p className="text-sm text-muted-foreground">No {type} assessments recorded.</p>;
  return (
    <div className="space-y-3">
      {rows.map(a => (
        <div key={a.id} className="rounded-sm border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{a.period}</span>
              <StatusBadge status={a.status} />
              {a.current_validation && (
                <span className={`text-[0.625rem] font-semibold uppercase ${a.current_validation === 'Current' ? 'text-ready' : 'text-review'}`}>
                  {a.current_validation}
                </span>
              )}
            </div>
            {a.overall_rating && <RatingBadge rating={a.overall_rating} />}
          </div>
          {a.narrative && <p className="mt-2 text-sm text-foreground">{a.narrative}</p>}
          {(a.flags?.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.flags.map((f, i) => <ReviewPill key={i}>{f.flag}</ReviewPill>)}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">Assessor: {a.assessor} {a.last_reassessment && `· Last reassessment ${a.last_reassessment}`}</div>
        </div>
      ))}
    </div>
  );
}

export function Development({ items = [], employee, onSaved }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No development actions recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Gap</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Agreed Action</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Owner</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Due</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 font-medium text-foreground">{d.gap}</td>
              <td className="py-2 pr-4 text-foreground">{d.action}</td>
              <td className="py-2 pr-4 text-foreground">{d.owner}</td>
              <td className="py-2 pr-4"><MonoValue>{d.due_date}</MonoValue></td>
              <td className="py-2">
                {employee
                  ? <RecordDevelopmentReview employee={employee} item={d} index={i} onSaved={onSaved} />
                  : <StatusBadge status={d.status} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTimeline({ items = [] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No historical changes recorded for this individual.</p>;
  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {items.map((r, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.6875rem] text-muted-foreground">{r.timestamp}</span>
            <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-foreground">{r.process}</span>
            {r.status === 'Governance Review Required' && <ReviewPill>Governance</ReviewPill>}
          </div>
          <p className="mt-1 text-sm text-foreground">
            <MonoValue>{r.original_value || '—'}</MonoValue> → <MonoValue>{r.new_value || '—'}</MonoValue>
          </p>
          {r.rationale && <p className="text-xs text-muted-foreground">Rationale: {r.rationale}</p>}
          <p className="text-xs text-muted-foreground">By {r.user} ({r.user_role})</p>
        </li>
      ))}
    </ol>
  );
}

export function Courses({ items = [] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No courses recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Course</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Completion Date</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Qualification / Skill Obtained</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-2 pr-4 font-medium text-foreground">{c.course}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={c.status || 'Planned'} />
              </td>
              <td className="py-2 pr-4"><MonoValue>{c.completion_date}</MonoValue></td>
              <td className="py-2 text-foreground">{c.qualification_skill_obtained || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PostingInfo({ e, onSaved }) {
  const a = e.posting_availability;
  if (!a) {
    return (
      <p className="text-sm text-muted-foreground">
        No posting availability recorded.{' '}
        <PostingAvailabilityEditor
          employee={e}
          onSaved={onSaved}
          renderTrigger={({ open }) => <ReviewPill onClick={open} title="Key in this individual's posting availability">Review Required</ReviewPill>}
        />
      </p>
    );
  }
  const items = [
    ['Current Tour End', <MonoValue key="te">{a.current_tour_end_date || '—'}</MonoValue>],
    ['Earliest Posting Date', <MonoValue key="ep">{a.earliest_posting_date || '—'}</MonoValue>],
    ['Availability Status', a.availability || '—'],
    ['Posting Restrictions', (a.posting_restrictions || []).length > 0 ? a.posting_restrictions.join(', ') : 'None']
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <SectionLabel>{label}</SectionLabel>
            <div className="mt-0.5 text-sm text-foreground">{value}</div>
          </div>
        ))}
      </div>
      {onSaved && (
        <div className="flex justify-end border-t border-border pt-3">
          <PostingAvailabilityEditor employee={e} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}

export function HRTags({ tags = [] }) {
  if (!tags.length) return <p className="text-sm text-muted-foreground">No HR tags assigned.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(t => (
        <span key={t} className="rounded-sm border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground">{t}</span>
      ))}
    </div>
  );
}