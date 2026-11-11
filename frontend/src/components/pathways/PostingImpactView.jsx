import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import {
  buildPostingChain,
  buildRecordedHolderBound,
  analyzeRemoval,
  findReplacementCandidates,
  analyzeCascade,
  analyzeDevelopmentToEligibility,
  projectReplacementChain
} from '@/lib/impactEngine';
import { AIPill, MonoValue, ReadyPill, ReviewPill, StatusBadge, SectionLabel } from '@/components/badges';
import { formatVocations } from '@/lib/postingEngine';
import WorkbookAppointmentPicker from '@/components/posting/WorkbookAppointmentPicker';
import CascadeProjectionPanel from '@/components/pathways/CascadeProjectionPanel';
import { Network, UserX, AlertTriangle, ChevronRight, ChevronDown, ArrowRight, ArrowDown, Check, X, GitBranch, Layers, Route } from 'lucide-react';

function getQuarter(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function CandidateAvatar({ name, id, role, variant }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground',
    alternate: 'bg-amber-100 text-review',
    dev: 'bg-secondary text-muted-foreground'
  };
  const labels = {
    primary: 'Primary',
    alternate: 'Alternate',
    dev: 'Dev'
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.625rem] font-semibold ${styles[variant]}`}>
        {name?.charAt(0) || '?'}
      </div>
      <div className="text-left">
        <div className="text-xs font-medium text-foreground leading-tight">{name || 'Vacant'}</div>
        <div className="text-[0.5625rem] uppercase tracking-wide text-muted-foreground leading-tight">{labels[variant]}</div>
      </div>
    </div>
  );
}

function ChainNode({ bound, onRemove }) {
  const isBound1 = bound.bound === 1;
  const hasAlternates = isBound1 && (bound.alternate1Name || bound.alternate2Name);
  const quarter = isBound1 ? getQuarter(bound.startDate) : null;

  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-sm border bg-card px-4 py-3 text-center ${isBound1 ? 'border-primary border-l-4' : 'border-border'}`} style={{ minWidth: hasAlternates ? '220px' : '180px' }}>
        <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Bound {bound.bound}</div>
        <div className="mt-1 text-sm font-medium text-foreground">{bound.appointmentTitle}</div>

        {/* Primary candidate */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {bound.personName?.charAt(0) || '?'}
          </div>
          <span className="text-xs text-foreground">{bound.personName || 'Vacant'}</span>
        </div>

        {/* Takeover date + quarter for bound 1 primary */}
        {isBound1 && bound.startDate && (
          <div className="mt-1.5 rounded-sm bg-primary/5 px-2 py-1 text-[0.625rem] text-primary">
            <span className="font-semibold">Expected Takeover:</span>{' '}
            <MonoValue>{bound.startDate}</MonoValue>
            {quarter && <span className="ml-1 font-semibold">({quarter})</span>}
          </div>
        )}

        {/* Alternates for bound 1 */}
        {hasAlternates && (
          <div className="mt-2 space-y-1.5 border-t border-border pt-2">
            <div className="text-[0.5625rem] font-semibold uppercase tracking-wider text-muted-foreground">Succession Candidates</div>
            {bound.alternate1Name && (
              <div className="flex items-center justify-center"><CandidateAvatar name={bound.alternate1Name} id={bound.alternate1Id} variant="alternate" /></div>
            )}
            {bound.alternate2Name && (
              <div className="flex items-center justify-center"><CandidateAvatar name={bound.alternate2Name} id={bound.alternate2Id} variant="alternate" /></div>
            )}
          </div>
        )}

        <div className="mt-1.5"><StatusBadge status={bound.status || 'Established'} /></div>
      </div>
      {onRemove && bound.personId && (
        <button onClick={() => onRemove(bound)} className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-review bg-amber-50 px-2 py-1 text-[0.625rem] font-medium text-review hover:bg-amber-100">
          <UserX className="h-3 w-3" /> Remove / Unavailable
        </button>
      )}
    </div>
  );
}

function VacantNode({ bound }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-sm border border-destructive border-dashed bg-red-50/50 px-4 py-3 text-center" style={{ minWidth: '180px' }}>
        <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-destructive">Bound {bound.bound}</div>
        <div className="mt-1 text-sm font-medium text-foreground">{bound.appointmentTitle}</div>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-destructive">
            <UserX className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-destructive">VACANCY CREATED</span>
        </div>
        <div className="mt-1.5"><span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-destructive">Replacement Required</span></div>
      </div>
    </div>
  );
}

function CandidateRow({ candidate, appointmentId, onViewPathway, onSelectReplacement }) {
  const [expanded, setExpanded] = useState(false);
  const r = candidate;
  return (
    <div className={`border-b border-border last:border-0 ${r.person.appt_end ? 'border-l-2 border-l-review bg-amber-50/30' : ''}`}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary/40">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{r.person.name}</span>
          <span className="font-mono text-[0.6875rem] text-muted-foreground">{r.person.employee_id}</span>
          <span className="text-[0.6875rem] text-muted-foreground">
            holds <span className="font-mono text-foreground">{r.person.current_appointment || 'no recorded appointment'}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${r.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{r.satisfactionPct}%</span>
          {r.status === 'Excluded' && (
            <span className="rounded-sm border border-destructive bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-destructive">
              Below the requirements — HR override
            </span>
          )}
          {r.person.appt_end && (
            <span
              title="APPT END is the date the workbook records for the end of this person's current appointment. It is a planning trigger date: it does not decide whether a second vacancy appears — the vacancy appears for every candidate chosen."
              className="rounded-sm border border-review bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review"
            >
              APPT END <span className="font-mono">{r.person.appt_end}</span> — posting trigger
            </span>
          )}
          {r.status === 'Eligible' && <ReadyPill>{r.readiness}</ReadyPill>}
          {r.status === 'Review Required' && <ReviewPill>{r.status}</ReviewPill>}
        </div>
      </button>
      {expanded && (
        <div className="bg-secondary/20 px-3 pb-3 pt-1">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><SectionLabel>Eligibility</SectionLabel><p className="mt-0.5 text-foreground">{r.components.eligibility.label}</p></div>
            <div><SectionLabel>Readiness</SectionLabel><p className="mt-0.5 text-foreground">{r.readiness}</p></div>
            <div><SectionLabel>Skills</SectionLabel><p className="mt-0.5 text-foreground">{r.components.skills.label}</p></div>
            <div><SectionLabel>Availability</SectionLabel><p className="mt-0.5 text-foreground">{r.components.availability.label}</p></div>
          </div>
          {/* Career pathway impact */}
          <div className="mt-2 rounded-sm bg-ai-soft p-2">
            <div className="flex items-center gap-1.5">
              <AIPill />
              <span className="text-[0.625rem] font-semibold uppercase text-ai">Career Pathway Impact</span>
            </div>
            <p className="mt-1 text-xs text-foreground">
              {r.components.preference.match
                ? `Aligns with stated career preference — moving this candidate supports their development pathway.`
                : `Not in stated career preferences — HR should assess impact on individual's development plan.`}
            </p>
          </div>
          {/* Whoever is chosen leaves the appointment they hold today to be filled — whether that
              appointment is ending, has already ended, or carries no end date at all. */}
          {r.person.current_appointment && r.person.current_appointment !== appointmentId ? (
            <div className="mt-2 rounded-sm border border-review bg-amber-50/60 p-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-review" />
                <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-review">Choice Creates A Second Vacancy</span>
              </div>
              <p className="mt-1 text-xs text-foreground">
                Holds <span className="font-mono">{r.person.current_appointment}</span> today. Selecting them leaves that appointment to be filled as well — the second vacancy arises either way.
                {r.person.appt_end
                  ? ` The workbook records an APPT END of ${r.person.appt_end} for it, which is the planning trigger date, not a condition of the vacancy.`
                  : ' No APPT END is recorded for it, so no trigger date is known.'}
              </p>
            </div>
          ) : (
            <div className="mt-2 rounded-sm border border-border bg-card p-2">
              <SectionLabel>No Second Vacancy</SectionLabel>
              <p className="mt-1 text-xs text-foreground">Holds no other recorded appointment, so choosing them leaves nothing further to fill.</p>
            </div>
          )}
          {/* Requirements recorded against the individual — the source records no requirement columns per appointment */}
          <div className="mt-2 rounded-sm border border-border bg-card p-2">
            <SectionLabel>Recorded Development &amp; Course Requirements</SectionLabel>
            <p className="mt-1 text-xs text-foreground">
              {(r.person.development || []).length > 0
                ? (r.person.development || []).map(d => `${d.gap}${d.gap_size ? ` (${d.gap_size})` : ''}${d.action ? ` → ${d.action}` : ''}`).join(' · ')
                : 'No development gaps recorded for this individual.'}
            </p>
            {(r.person.courses || []).filter(c => c.status === 'Planned').length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Planned courses: {(r.person.courses || []).filter(c => c.status === 'Planned').map(c => c.course).join(', ')}
              </p>
            )}
          </div>
          <div className="mt-2 flex justify-end gap-1.5">
            <button onClick={() => onSelectReplacement?.(r.person.employee_id, r.person.name, appointmentId)} className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[0.625rem] font-medium text-primary-foreground hover:bg-primary/90">
              <GitBranch className="h-3 w-3" /> Select & Project Chain
            </button>
            <button onClick={() => onViewPathway?.(r.person.employee_id, appointmentId)} className="inline-flex items-center gap-1 rounded-sm border border-primary bg-primary/5 px-2 py-1 text-[0.625rem] font-medium text-primary hover:bg-primary/10">
              <Route className="h-3 w-3" /> View Development Pathway
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostingImpactView({ onViewPathway, presetPersonId, presetApptId }) {
  const { employees, appointments, postingAssignments, successionPlans, skills, courses, loading } = useWorkbenchData();
  const [selectedApptId, setSelectedApptId] = useState(presetApptId || '');
  const [scenario, setScenario] = useState(null);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [recordedHolder, setRecordedHolder] = useState(null);

  React.useEffect(() => {
    if (presetApptId) {
      setSelectedApptId(presetApptId);
      setScenario(null);
      setSelectedReplacement(null);
    }
  }, [presetApptId]);

  const options = useMemo(() => ({ skillsLibrary: skills, courses, successionPlans }), [skills, courses, successionPlans]);

  const chain = useMemo(() => {
    if (!selectedApptId) return [];
    return buildPostingChain(selectedApptId, postingAssignments, successionPlans, employees, appointments);
  }, [selectedApptId, postingAssignments, successionPlans, employees, appointments]);

  // Where the source records no approved posting assignment or succession plan for the selected
  // appointment, the chain is anchored on the holder the workbook records as current.
  useEffect(() => {
    setRecordedHolder(null);
    if (!selectedApptId || chain.length > 0) return undefined;
    let cancelled = false;
    base44.entities.AppointmentHistory.filter({ appointment: selectedApptId }, { limit: 300 })
      .then(page => {
        if (cancelled) return;
        setRecordedHolder(buildRecordedHolderBound(selectedApptId, page.items || [], employees));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedApptId, chain.length, employees]);

  // What HR sees: the approved chain where one exists, otherwise the recorded current holder.
  const displayChain = chain.length > 0 ? chain : (recordedHolder ? [recordedHolder] : []);
  const historyDerived = chain.length === 0 && displayChain.length > 0;

  const handleRemove = (bound) => {
    const appointment = appointments.find(a => a.appointment_id === bound.appointmentId);
    if (!appointment) return;
    const impact = analyzeRemoval(bound.personId, bound.personName, bound.appointmentId, bound.appointmentTitle, displayChain, employees, appointments, options);
    const replacements = findReplacementCandidates(appointment, employees, options);
    setScenario({ removedBound: bound, impact, replacements, appointment });
    setSelectedReplacement(null);
  };

  const handleSelectReplacement = (personId, personName, appointmentId) => {
    setSelectedReplacement({ personId, personName, appointmentId });
  };

  // Every candidate who could fill the vacancy, listed together and ranked. Every one of them
  // holds an appointment today, so every choice leaves a second vacancy behind.
  const combinedOptions = useMemo(() => {
    if (!scenario) return [];
    return [...scenario.replacements.primaryOptions, ...scenario.replacements.alternateOptions]
      .sort((a, b) => (b._rank || 0) - (a._rank || 0));
  }, [scenario]);

  // Cascade analysis for the candidate heading the list — the one shown first to HR.
  const cascadeAnalysis = useMemo(() => {
    if (!combinedOptions[0]) return null;
    const top = combinedOptions[0];
    return analyzeCascade(top.person.employee_id, top.person.name, scenario.removedBound.appointmentId, postingAssignments, successionPlans, employees, appointments, options);
  }, [scenario, combinedOptions, postingAssignments, successionPlans, employees, appointments, options]);

  // How many of the rows actually listed below carry an APPT END. The workbook records one for
  // only a handful of personnel, so the amber flag is rare — the list says so rather than
  // showing nothing and leaving HR to guess why.
  const amberRows = useMemo(() => {
    if (!scenario) return { shown: 0, total: 0 };
    const listed = [...combinedOptions.slice(0, 8), ...scenario.replacements.developmentOptions.slice(0, 5)];
    return {
      shown: listed.filter(r => r.person.appt_end).length,
      total: employees.filter(e => e.appt_end).length
    };
  }, [scenario, combinedOptions, employees]);

  // Full cascade projection when a specific replacement is selected: every subsequent vacancy
  const chainProjection = useMemo(() => {
    if (!selectedReplacement) return null;
    return projectReplacementChain(
      selectedReplacement.personId,
      selectedReplacement.personName,
      selectedReplacement.appointmentId,
      postingAssignments,
      successionPlans,
      employees,
      appointments,
      options
    );
  }, [selectedReplacement, postingAssignments, successionPlans, employees, appointments, options]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Posting Impact — Multi-Bound Chain</h3>
          <AIPill />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Select an appointment to visualise the posting chain. Remove any person to trigger a what-if scenario. The system does NOT modify the approved plan.</p>
        <div className="mt-3">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Appointment (workbook)</label>
          <div className="mt-1 max-w-md">
            <WorkbookAppointmentPicker
              value={selectedApptId}
              onChange={label => { setSelectedApptId(label); setScenario(null); setSelectedReplacement(null); }}
              buttonClassName="w-full"
              occupiedFirst
            />
          </div>
        </div>
      </div>

      {/* Nothing recorded for the selected appointment */}
      {selectedApptId && displayChain.length === 0 && (
        <div className="rounded-sm border border-border bg-card px-4 py-8 text-center">
          <Network className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            The source records no current holder, posting assignment or succession plan against “{selectedApptId}”, so there is no posting chain to assess.
            Nothing is assumed where the source records nothing.
          </p>
        </div>
      )}

      {/* Baseline posting chain */}
      {displayChain.length > 0 && (
        <div className="rounded-sm border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Baseline Plan — Established Posting Chain</h3>
            {historyDerived && <ReviewPill>Recorded holder — no approved plan on file</ReviewPill>}
          </div>
          {historyDerived && (
            <p className="mt-1 text-xs text-muted-foreground">
              No posting assignment or succession plan is recorded for this appointment. The chain starts from the holder recorded in the source workbook, so HR can still test impact.
            </p>
          )}
          <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-2">
            {displayChain.map((b, i) => (
              <div key={i} className="flex items-center">
                <ChainNode bound={b} onRemove={handleRemove} />
                {i < displayChain.length - 1 && <ArrowRight className="mx-1 h-5 w-5 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What-if scenario */}
      {scenario && (
        <>
          <div className="rounded-sm border border-review bg-amber-50/50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-review" />
              <h3 className="text-sm font-semibold text-review">What-If Scenario — {scenario.removedBound.personName} Removed from {scenario.removedBound.appointmentTitle}</h3>
            </div>
            <p className="mt-1 text-xs text-foreground">The approved posting plan is NOT modified. This is a scenario for HR review only.</p>
          </div>

          {/* Revised chain */}
          <div className="rounded-sm border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Revised Chain — What-If Scenario</h3>
            <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-2">
              {displayChain.map((b, i) => (
                <div key={i} className="flex items-center">
                  {b.bound === scenario.removedBound.bound ? (
                    <VacantNode bound={b} />
                  ) : (
                    <ChainNode bound={b} />
                  )}
                  {i < displayChain.length - 1 && <ArrowRight className="mx-1 h-5 w-5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>

          {/* Impact Classification */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Immediate */}
            <div className="rounded-sm border border-destructive border-l-4 bg-red-50/30 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive">Immediate Impact</h4>
              <p className="mt-1.5 text-sm text-foreground">{scenario.impact.immediateImpact.vacancy}</p>
            </div>
            {/* Upstream */}
            <div className="rounded-sm border border-review border-l-4 bg-amber-50/30 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-review">Upstream Development / Pipeline Impact</h4>
              <div className="mt-1.5 space-y-1">
                {scenario.impact.upstream.map((u, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-foreground">{u.type}:</span> <span className="text-muted-foreground">{u.detail}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Downstream */}
            <div className="rounded-sm border border-primary border-l-4 bg-primary/5 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Downstream Succession / Posting Impact</h4>
              <div className="mt-1.5 space-y-1">
                {scenario.impact.downstream.length === 0 && <p className="text-xs text-muted-foreground">No downstream dependencies identified.</p>}
                {scenario.impact.downstream.map((d, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-foreground">{d.type}:</span> <span className="text-muted-foreground">{d.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Replacement candidates */}
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Replacement Candidates — Re-run Eligibility</h3>
                <AIPill />
              </div>
              <span className="text-xs text-muted-foreground">All personnel re-evaluated, not just previous alternates</span>
            </div>
            {/* Every candidate is an option for this vacancy and every choice leaves the appointment
                they hold today to be filled, so they are listed together — separated only by whether
                they meet the requirements, not by a Primary/Alternate split. */}
            <div className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/40 px-4 py-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Meets The Requirements — Best Ranked First</h4>
              </div>
              <p className="bg-card px-4 pb-2 text-[0.625rem] text-muted-foreground">
                All personnel re-evaluated, ranked on requirements met, then skills, then fewest gaps. Every row shows the appointment the person holds today. Choosing any candidate leaves the appointment they hold to be filled, so a second vacancy arises for every choice — whether that appointment is ending, has already ended, or has no end date recorded. An amber row marks a person whose appointment carries a recorded APPT END, which gives the trigger date for planning: it is not what decides whether the vacancy appears.
              </p>
              {amberRows.shown > 0 ? (
                <p className="bg-card px-4 pb-2 text-[0.625rem] font-semibold text-review">
                  {amberRows.shown} of the candidates listed below {amberRows.shown === 1 ? 'has' : 'have'} a recorded APPT END — for those rows the trigger date of their own appointment is known. Every other row creates the same second vacancy; only its date is unrecorded.
                </p>
              ) : (
                <p className="bg-card px-4 pb-2 text-[0.625rem] text-muted-foreground">
                  No candidate listed below has an APPT END recorded, so no amber row appears here — but the second vacancy still arises for whichever of them is chosen, only without a known trigger date. The imported personnel record an APPT END for {amberRows.total} {amberRows.total === 1 ? 'person' : 'people'} in total.
                </p>
              )}
              <div>
                {combinedOptions.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No eligible candidate is recorded for this appointment.</p>}
                {combinedOptions.slice(0, 8).map((r, i) => <CandidateRow key={i} candidate={r} appointmentId={scenario.removedBound.appointmentId} onViewPathway={onViewPathway} onSelectReplacement={handleSelectReplacement} />)}
              </div>
            </div>
            <div className="grid grid-cols-1">
              {/* Development */}
              <div>
                <div className="bg-secondary/50 px-4 py-2"><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Below The Requirements — HR Override Needed</h4></div>
                <p className="bg-card px-3 pt-2 text-[0.625rem] text-muted-foreground">Recorded below the mandatory criteria: choosing one is an HR override and must be justified, so they are kept apart from the list above.</p>
                <div>
                  {scenario.replacements.developmentOptions.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">Nobody is recorded below the requirements for this appointment.</p>}
                  {scenario.replacements.developmentOptions.slice(0, 5).map((r, i) => <CandidateRow key={i} candidate={r} appointmentId={scenario.removedBound.appointmentId} onViewPathway={onViewPathway} onSelectReplacement={handleSelectReplacement} />)}
                </div>
              </div>
            </div>
          </div>

          {/* Cascade analysis */}
          {cascadeAnalysis?.createsSecondaryVacancy && (
            <div className="rounded-sm border border-destructive bg-red-50/30 p-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Cascade / Domino Effect — Moving {cascadeAnalysis.candidateName} Creates Secondary Vacancy</h3>
              </div>
              <div className="mt-3 space-y-2">
                {cascadeAnalysis.secondaryVacancies.map((v, i) => (
                  <div key={i} className="rounded-sm border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{v.appointmentTitle}</span>
                      <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-destructive">Becomes Vacant</span>
                    </div>
                    <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                      {v.type === 'held_appointment'
                        ? `The appointment ${cascadeAnalysis.candidateName} holds today${v.apptEnd ? ` — APPT END ${v.apptEnd} recorded` : ' — no APPT END recorded'}.`
                        : v.type === 'posting_assignment'
                          ? `${cascadeAnalysis.candidateName} is already the approved primary for this appointment.`
                          : `${cascadeAnalysis.candidateName} is already named a successor for this appointment.`}
                    </p>
                    <div className="mt-2">
                      <SectionLabel>Replacement Options for This Vacancy</SectionLabel>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {v.primaryReplacements.map((r, j) => (
                          <span key={j} className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-ready">
                            {r.personName} ({r.satisfactionPct}%)
                          </span>
                        ))}
                        {v.alternateReplacements.map((r, j) => (
                          <span key={j} className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-review">
                            {r.personName} ({r.satisfactionPct}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">The system does NOT recommend the candidate with the fewest posting changes. HR must evaluate trade-offs.</p>
            </div>
          )}

          {cascadeAnalysis && !cascadeAnalysis.createsSecondaryVacancy && !cascadeAnalysis.stopped && (
            <div className="rounded-sm border border-ready bg-emerald-50/30 p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ready" />
                <span className="text-sm font-medium text-ready">No cascade conflict — {cascadeAnalysis.candidateName} holds no other recorded appointment and is named on no other plan, so this move leaves nothing else to fill.</span>
              </div>
            </div>
          )}

          {cascadeAnalysis?.stopped && (
            <div className="rounded-sm border border-destructive bg-red-50/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Cascade stopped: {cascadeAnalysis.reason}</span>
              </div>
            </div>
          )}

          {/* Full cascading projection for the selected candidate */}
          <CascadeProjectionPanel
            projection={chainProjection}
            candidateName={selectedReplacement?.personName}
            onClear={() => setSelectedReplacement(null)}
          />

          <button onClick={() => { setScenario(null); setSelectedReplacement(null); }} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            Dismiss Scenario
          </button>
        </>
      )}
    </div>
  );
}