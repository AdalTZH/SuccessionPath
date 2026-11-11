import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { useFilters, matchesFilters } from '@/lib/FilterContext';
import { matchPersonToAppointment, buildFunnel, buildShortlist, detectCascade } from '@/lib/postingEngine';
import { isTalent } from '@/lib/grooming';
import { fetchAppointmentBasis, buildDerivedRequirement, resolveAssignment } from '@/lib/appointmentBasis';
import WorkbookAppointmentPicker from '@/components/posting/WorkbookAppointmentPicker';
import AppointmentBasisPanel from '@/components/posting/AppointmentBasisPanel';
import { AIPill, MonoValue, ReadyPill, ReviewPill, StatusBadge } from '@/components/badges';
import FilterFunnel from '@/components/posting/FilterFunnel';
import CandidateExplain from '@/components/posting/CandidateExplain';
import RotationTimeline from '@/components/posting/RotationTimeline';
import { base44 } from '@/api/base44Client';
import { ArrowLeftRight, UserX, AlertTriangle, Check, X, ChevronDown, ChevronRight, CalendarClock } from 'lucide-react';

const DROPOUT_REASONS = [
  'Resignation / Exit',
  'Medical / Eligibility Change',
  'Extension in Current Appointment',
  'Selected for Another Appointment',
  'Personal Constraint',
  'Qualification / Course Not Completed',
  'Other'
];

export default function PostingWorkbench() {
  const { employees, appointments, postingAssignments, skills, courses, loading } = useWorkbenchData();
  const filters = useFilters();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState('A'); // A = Appointment→Candidate, B = Individual→Appointment, T = Rotation Timeline
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [basis, setBasis] = useState(null);
  const [basisLoading, setBasisLoading] = useState(false);
  const [localPA, setLocalPA] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [showDropOut, setShowDropOut] = useState(false);
  const [dropOutReason, setDropOutReason] = useState(DROPOUT_REASONS[0]);
  const [cascadeResult, setCascadeResult] = useState(null);
  const [assignMsg, setAssignMsg] = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overridePerson, setOverridePerson] = useState(null);
  const [overridePct, setOverridePct] = useState(0);
  const [overrideRole, setOverrideRole] = useState('primary');
  const [overrideJustification, setOverrideJustification] = useState('');

  const filteredEmployees = useMemo(() => employees.filter(e => matchesFilters(e, filters)), [employees, filters]);

  // A P1/P2 appointment is a grooming appointment — shown here so the rule is visible at the
  // moment a placement is made, not only afterwards in the mismatch list.
  const selectedGroomingTier = useMemo(
    () => (appointments || []).find(a => a.appointment_id === selectedLabel)?.grooming_tier || '',
    [appointments, selectedLabel]
  );

  // Auto-select the most common workbook appointment, or the one named in the link
  React.useEffect(() => {
    if (loading) return;
    // Deep link from a posting case: the individual's own matching, e.g. ?employee=PER001
    const personParam = searchParams.get('employee');
    if (personParam && mode === 'A') {
      setMode('B');
      setSelectedPersonId(personParam);
      // Give the view a target appointment to match against — HR changes it to the intended posting.
      base44.entities.AppointmentCatalogue.list('-usage_count', 1).then(rows => {
        if (rows && rows[0]) setSelectedLabel(rows[0].label);
      });
      return;
    }
    if (mode === 'B' && !selectedPersonId && filteredEmployees.length) {
      setSelectedPersonId(filteredEmployees[0].employee_id);
    }
    if (mode !== 'A' || selectedLabel) return;
    const apptParam = searchParams.get('appt');
    if (apptParam) { setSelectedLabel(apptParam); return; }
    base44.entities.AppointmentCatalogue.list('-usage_count', 1).then(rows => {
      if (rows && rows[0]) setSelectedLabel(rows[0].label);
    });
  }, [loading, mode, filteredEmployees, searchParams, selectedLabel]);

  // The workbook records no requirement columns, so the matching basis is derived from
  // the rank and vocation of the personnel who have held this appointment.
  React.useEffect(() => {
    if (!selectedLabel) return;
    let cancelled = false;
    setBasisLoading(true);
    setBasis(null);
    fetchAppointmentBasis(selectedLabel)
      .then(result => { if (!cancelled) setBasis(result); })
      .finally(() => { if (!cancelled) setBasisLoading(false); });
    return () => { cancelled = true; };
  }, [selectedLabel]);

  const requirement = useMemo(
    () => (basis ? buildDerivedRequirement(selectedLabel, basis) : null),
    [basis, selectedLabel]
  );
  const selectedPerson = employees.find(e => e.employee_id === selectedPersonId);
  const currentPA = localPA && localPA.appointment_id === selectedLabel
    ? localPA
    : postingAssignments.find(pa => pa.appointment_id === selectedLabel);

  // Mode A: match population to selected appointment
  const funnel = useMemo(() => {
    if (!requirement) return null;
    return buildFunnel(filteredEmployees, requirement);
  }, [requirement, filteredEmployees]);

  const allMatches = useMemo(() => {
    if (!requirement) return [];
    const options = { skillsLibrary: skills, courses };
    return filteredEmployees.map(p => ({ person: p, ...matchPersonToAppointment(p, requirement, options) }));
  }, [requirement, filteredEmployees]);

  const eligibleMatches = allMatches.filter(r => r.status === 'Eligible' || r.status === 'Review Required').sort((a, b) => b._rank - a._rank);
  const excludedMatches = allMatches.filter(r => r.status === 'Excluded');

  // Mode B: match the selected individual against the selected workbook appointment,
  // using the basis derived from that appointment's own recorded holders.
  const personMatch = useMemo(() => {
    if (!selectedPerson || !requirement) return null;
    return matchPersonToAppointment(selectedPerson, requirement, { skillsLibrary: skills, courses });
  }, [selectedPerson, requirement, skills, courses]);

  // Assignment handlers
  const assignCandidate = async (role, person) => {
    const updates = {};
    if (role === 'primary') { updates.primary_candidate_id = person.employee_id; updates.primary_candidate_name = person.name; }
    if (role === 'alt1') { updates.alternate1_id = person.employee_id; updates.alternate1_name = person.name; }
    if (role === 'alt2') { updates.alternate2_id = person.employee_id; updates.alternate2_name = person.name; }
    updates.status = 'Primary Identified';
    try {
      const pa = currentPA || await resolveAssignment(selectedLabel);
      setLocalPA(await base44.entities.PostingAssignment.update(pa.id, updates));
      setAssignMsg(`${person.name} assigned as ${role === 'primary' ? 'Primary' : role === 'alt1' ? 'Alternate 1' : 'Alternate 2'}`);
      setTimeout(() => setAssignMsg(null), 3000);
    } catch (e) { setAssignMsg('Assignment failed — try again'); }
  };

  const handleOverrideAssign = async () => {
    if (!overridePerson || !overrideJustification.trim()) return;
    const updates = { hr_override: true, override_justification: overrideJustification.trim() };
    if (overrideRole === 'primary') { updates.primary_candidate_id = overridePerson.employee_id; updates.primary_candidate_name = overridePerson.name; }
    if (overrideRole === 'alt1') { updates.alternate1_id = overridePerson.employee_id; updates.alternate1_name = overridePerson.name; }
    if (overrideRole === 'alt2') { updates.alternate2_id = overridePerson.employee_id; updates.alternate2_name = overridePerson.name; }
    updates.status = 'Primary Identified';
    updates.selection_rationale = `HR OVERRIDE — ${overrideJustification.trim()}`;
    try {
      const pa = currentPA || await resolveAssignment(selectedLabel);
      setLocalPA(await base44.entities.PostingAssignment.update(pa.id, updates));
      await base44.entities.AuditRecord.create({
        individual: overridePerson.name,
        process: 'Posting Eligibility Override',
        original_value: `Excluded (${overridePct}% criteria met — below 60% threshold)`,
        new_value: 'Eligible by HR Override',
        rationale: overrideJustification.trim(),
        status: 'Override Applied',
        timestamp: new Date().toISOString()
      });
      setAssignMsg(`${overridePerson.name} assigned via HR override`);
      setTimeout(() => setAssignMsg(null), 3000);
      setShowOverride(false);
      setOverridePerson(null);
      setOverrideJustification('');
    } catch (e) { setAssignMsg('Override failed — try again'); }
  };

  const handleDropOut = async () => {
    if (!currentPA) return;
    try {
      const updated = await base44.entities.PostingAssignment.update(currentPA.id, {
        status: 'Replacement Required',
        selection_rationale: `Primary unavailable: ${dropOutReason}`
      });
      setLocalPA(updated);
      // Check cascade for the next alternate
      const nextAlternateId = currentPA.alternate1_id;
      let cascade = null;
      if (nextAlternateId) {
        const conflicts = detectCascade(nextAlternateId, postingAssignments.filter(pa => pa.appointment_id !== selectedLabel));
        if (conflicts.length > 0) {
          cascade = { alternateId: nextAlternateId, alternateName: currentPA.alternate1_name, conflicts };
        }
      }
      setCascadeResult(cascade);
      setShowDropOut(false);
    } catch (e) { setAssignMsg('Drop-out update failed'); }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">Posting Workbench</h1>
        <p className="text-sm text-muted-foreground">Two-way matching, auto-filtering and scenario management. AI consolidates and filters — HR confirms all decisions.</p>
      </div>

      {/* Mode toggle + selector */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-sm border border-border bg-card p-0.5">
          <button
            onClick={() => setMode('A')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${mode === 'A' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Appointment → Candidate
          </button>
          <button
            onClick={() => setMode('B')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${mode === 'B' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Individual → Appointment
          </button>
          <button
            onClick={() => setMode('T')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${mode === 'T' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <CalendarClock className="h-3.5 w-3.5" /> Rotation Timeline
          </button>
        </div>

        {mode !== 'T' && (
          <WorkbookAppointmentPicker
            value={selectedLabel}
            onChange={label => { setSelectedLabel(label); setLocalPA(null); setExpandedCandidate(null); setCascadeResult(null); }}
          />
        )}
        {mode === 'B' && (
          <select
            value={selectedPersonId || ''}
            onChange={e => { setSelectedPersonId(e.target.value); }}
            className="min-w-[20rem] rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            {filteredEmployees.map(e => (
              <option key={e.employee_id} value={e.employee_id}>
                {e.name} — {e.rank} {e.vocation} ({e.employee_id})
              </option>
            ))}
          </select>
        )}

        {assignMsg && <span className="text-xs font-medium text-ready">{assignMsg}</span>}
      </div>

      {/* ==================== MODE A: Appointment → Candidate ==================== */}
      {mode === 'A' && basisLoading && (
        <div className="mb-4 flex h-32 items-center justify-center rounded-sm border border-border bg-card">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-secondary border-t-primary" />
        </div>
      )}

      {mode === 'A' && !basisLoading && requirement && (
        <>
          <AppointmentBasisPanel label={selectedLabel} basis={basis} requirement={requirement} />

          {selectedGroomingTier && (
            <div className="mb-4 rounded-sm border border-primary border-l-4 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground">
                  Grooming {selectedGroomingTier}
                </span>
                <span className="text-xs font-medium text-foreground">This is a P1/P2 grooming appointment.</span>
                <AIPill />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Grooming appointments are held for talent (T1/T1+) + wrangler individuals. Placing anyone else is a
                grooming mismatch and needs an HR override with a recorded reason.
              </p>
            </div>
          )}

          {/* Current assignment + drop-out */}
          {currentPA && (
            <div className="mb-4 rounded-sm border border-border bg-secondary/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Primary:</span>{' '}
                    <span className="font-medium text-foreground">{currentPA.primary_candidate_name || 'Not assigned'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Alt 1:</span>{' '}
                    <span className="font-medium text-foreground">{currentPA.alternate1_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Alt 2:</span>{' '}
                    <span className="font-medium text-foreground">{currentPA.alternate2_name || '—'}</span>
                  </div>
                  <StatusBadge status={currentPA.status} />
                </div>
                {currentPA.primary_candidate_id && currentPA.status !== 'Replacement Required' && (
                  <button
                    onClick={() => setShowDropOut(true)}
                    title="Mark the primary candidate as unavailable. The appointment will require a replacement — the system will identify the next alternate and check for cascading impact. HR must confirm any replacement."
                    className="inline-flex items-center gap-1.5 rounded-sm border border-review bg-amber-50 px-3 py-1.5 text-xs font-medium text-review hover:bg-amber-100"
                  >
                    <UserX className="h-3.5 w-3.5" /> Candidate Unavailable
                  </button>
                )}
              </div>
              {currentPA.selection_rationale && (
                <p className="mt-2 text-xs text-muted-foreground">Rationale: {currentPA.selection_rationale}</p>
              )}
            </div>
          )}

          {/* Cascade result */}
          {cascadeResult && (
            <div className="mb-4 rounded-sm border border-review bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-review" />
                <h3 className="text-sm font-semibold text-review">Replacement Options Identified — HR Review Required</h3>
              </div>
              <p className="mt-1.5 text-xs text-foreground">
                Next alternate <span className="font-semibold">{cascadeResult.alternateName}</span> is currently planned for:
              </p>
              <div className="mt-2 space-y-1.5">
                {cascadeResult.conflicts.map(c => (
                  <div key={c.id} className="rounded-sm border border-border bg-card px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{c.appointment_title}</span>
                    <span className="ml-2 text-muted-foreground">— moving this candidate would leave this appointment uncovered</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cascading impact detected. The system will NOT automatically move personnel. HR must confirm any replacement.
              </p>
            </div>
          )}

          {/* Funnel + Candidate list */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              {funnel && <FilterFunnel steps={funnel.steps} />}
            </div>

            <div className="lg:col-span-8">
              {/* Candidate list */}
              <div className="rounded-sm border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Candidate List</h3>
                    <AIPill />
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-ready">{eligibleMatches.filter(m => m.status === 'Eligible').length} Eligible</span>
                    <span className="text-review">{eligibleMatches.filter(m => m.status === 'Review Required').length} Review</span>
                    <span className="text-destructive">{excludedMatches.length} Excluded</span>
                  </div>
                </div>

                {/* Eligible + Review candidates */}
                <div className="divide-y divide-border">
                  {eligibleMatches.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No eligible candidates after mandatory filtering. Try relaxing desirable criteria.
                    </div>
                  )}
                  {eligibleMatches.map(r => (
                    <div key={r.person.id}>
                      <button
                        onClick={() => setExpandedCandidate(expandedCandidate === r.person.id ? null : r.person.id)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40"
                      >
                        <div className="flex items-center gap-3">
                          {expandedCandidate === r.person.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          <div>
                            <span className="text-sm font-medium text-foreground">{r.person.name}</span>
                            <span className="ml-2 font-mono text-[0.6875rem] text-muted-foreground">{r.person.employee_id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedGroomingTier && !isTalent(r.person) && (
                            <span
                              title={`This is a ${selectedGroomingTier} grooming appointment — placing a non-talent needs an HR override.`}
                              className="rounded-sm border border-review bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review"
                            >
                              Not a talent — override
                            </span>
                          )}
                          <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${r.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{r.satisfactionPct}% met</span>
                          {r.status === 'Eligible' ? <ReadyPill>{r.readiness}</ReadyPill> : <ReviewPill>{r.status}</ReviewPill>}
                        </div>
                      </button>
                      {expandedCandidate === r.person.id && (
                        <div className="bg-secondary/20 px-4 pb-4 pt-2">
                          <CandidateExplain result={r} person={r.person} />
                          {/* Assignment controls */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => assignCandidate('primary', r.person)} className="rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">Set as Primary</button>
                            <button onClick={() => assignCandidate('alt1', r.person)} className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary">Set as Alt 1</button>
                            <button onClick={() => assignCandidate('alt2', r.person)} className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary">Set as Alt 2</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Excluded candidates (collapsible) */}
                {excludedMatches.length > 0 && (
                  <details className="border-t border-border">
                    <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-destructive hover:bg-secondary/40">
                      {excludedMatches.length} Excluded — click to expand
                    </summary>
                    <div className="divide-y divide-border">
                      {excludedMatches.map(r => (
                        <div key={r.person.id}>
                          <button
                            onClick={() => setExpandedCandidate(expandedCandidate === r.person.id ? null : r.person.id)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40"
                          >
                            <div className="flex items-center gap-3">
                              {expandedCandidate === r.person.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <div>
                                <span className="text-sm font-medium text-foreground">{r.person.name}</span>
                                <span className="ml-2 font-mono text-[0.6875rem] text-muted-foreground">{r.person.employee_id}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-destructive">{r.satisfactionPct}% met</span>
                              <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-destructive">
                                <X className="h-2.5 w-2.5" /> Excluded
                              </span>
                            </div>
                          </button>
                          {expandedCandidate === r.person.id && (
                            <div className="bg-secondary/20 px-4 pb-4 pt-2">
                              <CandidateExplain result={r} person={r.person} />
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">Below 60% threshold — HR override required to assign.</span>
                                <button
                                  onClick={() => { setOverridePerson(r.person); setOverridePct(r.satisfactionPct); setShowOverride(true); }}
                                  className="rounded-sm border border-review bg-amber-50 px-2.5 py-1 text-xs font-medium text-review hover:bg-amber-100"
                                >
                                  Override & Assign
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== MODE T: Rotation Timeline ==================== */}
      {mode === 'T' && (
        <RotationTimeline
          postingAssignments={postingAssignments}
          onSelectAppointment={(apptId) => {
            setSelectedLabel(apptId);
            setLocalPA(null);
            setExpandedCandidate(null);
            setCascadeResult(null);
            setMode('A');
          }}
        />
      )}

      {/* ==================== MODE B: Individual → Appointment ==================== */}
      {mode === 'B' && selectedPerson && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-sm border border-border bg-card p-4">
              <h2 className="text-base font-semibold text-foreground">{selectedPerson.name}</h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedPerson.employee_id} · {selectedPerson.rank} · {selectedPerson.vocation}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div><span className="text-muted-foreground">Current:</span> <span className="text-foreground">{selectedPerson.current_appointment}</span></div>
                <div><span className="text-muted-foreground">Available:</span> <MonoValue>{selectedPerson.posting_availability?.earliest_posting_date || 'Not recorded'}</MonoValue></div>
                {(selectedPerson.posting_availability?.posting_restrictions || []).length > 0 && (
                  <div className="text-review">Restrictions: {selectedPerson.posting_availability.posting_restrictions.join(', ')}</div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">HR Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(selectedPerson.hr_tags || []).map(t => (
                    <span key={t} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-8">
            {basisLoading && (
              <div className="flex h-32 items-center justify-center rounded-sm border border-border bg-card">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-secondary border-t-primary" />
              </div>
            )}
            {!basisLoading && requirement && selectedLabel && (
              <AppointmentBasisPanel label={selectedLabel} basis={basis} requirement={requirement} />
            )}
            {!basisLoading && requirement && (
              <div className="rounded-sm border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Match against {selectedLabel}</h3>
                    <AIPill />
                  </div>
                  {personMatch && (
                    <div className="flex items-center gap-2">
                      <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${personMatch.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{personMatch.satisfactionPct}% met</span>
                      {personMatch.status === 'Eligible' ? <ReadyPill>{personMatch.readiness}</ReadyPill> : <ReviewPill>{personMatch.status}</ReviewPill>}
                    </div>
                  )}
                </div>
                {personMatch && (
                  <div className="px-4 pb-4 pt-3">
                    <CandidateExplain result={personMatch} person={selectedPerson} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => assignCandidate('primary', selectedPerson)} className="rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">Set as Primary</button>
                      <button onClick={() => assignCandidate('alt1', selectedPerson)} className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary">Set as Alt 1</button>
                      <button onClick={() => assignCandidate('alt2', selectedPerson)} className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary">Set as Alt 2</button>
                      {personMatch.status === 'Excluded' && (
                        <button
                          onClick={() => { setOverridePerson(selectedPerson); setOverridePct(personMatch.satisfactionPct); setShowOverride(true); }}
                          className="rounded-sm border border-review bg-amber-50 px-2.5 py-1 text-xs font-medium text-review hover:bg-amber-100"
                        >
                          Override & Assign
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drop-out dialog */}
      {showDropOut && currentPA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDropOut(false)}>
          <div className="mx-4 w-full max-w-md rounded-sm border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-review" />
              <h3 className="text-base font-semibold text-foreground">Candidate Unavailable</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Mark <span className="font-medium text-foreground">{currentPA.primary_candidate_name}</span> as unavailable for <span className="font-medium text-foreground">{currentPA.appointment_title}</span>.
            </p>

            {/* Impact preview */}
            <div className="mt-3 space-y-2.5 rounded-sm border border-border bg-secondary/30 p-3">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">What will happen</p>
                <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                  <li className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-review" /> Appointment status changes to "Replacement Required"</li>
                  <li className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-review" /> Primary candidate slot becomes vacant</li>
                  {currentPA.alternate1_id ? (
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-ready" /> Next alternate ({currentPA.alternate1_name}) will be evaluated as potential replacement</li>
                  ) : (
                    <li className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-destructive" /> No alternates identified — full re-run of eligibility required</li>
                  )}
                  {currentPA.alternate1_id && postingAssignments.some(pa => pa.appointment_id !== currentPA.appointment_id && pa.primary_candidate_id === currentPA.alternate1_id && pa.status !== 'Replacement Required') && (
                    <li className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-destructive" /> Alternate 1 is assigned to another appointment — moving them will create a secondary vacancy</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">What the system will do</p>
                <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                  <li>• Re-run eligibility matching for this appointment</li>
                  <li>• Check if the next alternate has cascading impact (assigned elsewhere)</li>
                  <li>• Flag any secondary vacancies created by moving the alternate</li>
                </ul>
              </div>
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">What HR must do</p>
                <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                  <li>• Review replacement options and confirm the new candidate</li>
                  <li>• Resolve any cascading vacancies identified</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Reason</label>
              <select
                value={dropOutReason}
                onChange={e => setDropOutReason(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {DROPOUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowDropOut(false)} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
              <button onClick={handleDropOut} className="rounded-sm bg-review px-3 py-1.5 text-xs font-medium text-review-foreground hover:bg-review/90">Confirm Unavailable</button>
            </div>
            <p className="mt-3 text-[0.6875rem] text-muted-foreground">The system will NOT automatically finalise the replacement. HR review required.</p>
          </div>
        </div>
      )}

      {/* HR Override dialog */}
      {showOverride && overridePerson && selectedLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOverride(false)}>
          <div className="mx-4 w-full max-w-md rounded-sm border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-review" />
              <h3 className="text-base font-semibold text-foreground">HR Override — Eligibility Threshold Not Met</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{overridePerson.name}</span> meets {overridePct}% of criteria (threshold: 60%) for <span className="font-medium text-foreground">{selectedLabel}</span>. HR judgement override requires justification.
            </p>
            <div className="mt-4">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Assign as</label>
              <select value={overrideRole} onChange={e => setOverrideRole(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground">
                <option value="primary">Primary Candidate</option>
                <option value="alt1">Alternate 1</option>
                <option value="alt2">Alternate 2</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Justification (required)</label>
              <textarea value={overrideJustification} onChange={e => setOverrideJustification(e.target.value)}
                placeholder="Enter HR justification for overriding eligibility threshold…"
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground" rows={3} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowOverride(false)} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
              <button onClick={handleOverrideAssign} disabled={!overrideJustification.trim()}
                className="rounded-sm bg-review px-3 py-1.5 text-xs font-medium text-review-foreground hover:bg-review/90 disabled:opacity-50 disabled:cursor-not-allowed">Confirm Override & Assign</button>
            </div>
            <p className="mt-3 text-[0.6875rem] text-muted-foreground">This override will be recorded in the audit trail.</p>
          </div>
        </div>
      )}
    </div>
  );
}