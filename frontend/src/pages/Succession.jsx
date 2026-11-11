import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { profileTabPath, tabForText, reviewFocus } from '@/lib/reviewTabs';
import { useFilters, matchesFilters } from '@/lib/FilterContext';
import {
  classifySuccessionDepth,
  buildSuccessionChain,
  findPersonInSuccessionPlans,
  detectCompetingDemand,
  analyzeContingency,
  buildSuccessionRiskSummary
} from '@/lib/successionEngine';
import SuccessionChain from '@/components/succession/SuccessionChain';
import HistoryCandidateSuggestions from '@/components/succession/HistoryCandidateSuggestions';
import { fillSuccessionSlotsFromHistory } from '@/lib/historySuccession';
import { StatusBadge, AIPill, ReadyPill, ReviewPill, MonoValue } from '@/components/badges';
import { AlertTriangle, UserX, Network, AlertCircle, ChevronDown, ChevronRight, Shield, GitBranch, Sparkles } from 'lucide-react';

const VIEWS = [
  { id: 'appointment', label: 'Appointment-Centric', icon: Network },
  { id: 'individual', label: 'Individual-Centric', icon: UserX },
  { id: 'history', label: 'History-Derived Candidates', icon: GitBranch },
  { id: 'risk', label: 'Succession Risk', icon: AlertCircle }
];

const DROPOUT_REASONS = [
  'Resignation / Exit',
  'Reassignment',
  'Retained in Current Appointment',
  'Medical / Eligibility Change',
  'Selected for Another Appointment',
  'Personal Constraint',
  'Qualification / Course Not Completed',
  'Posting Date Changed',
  'Other'
];

export default function Succession() {
  const { employees, appointments, successionPlans, skills, courses, loading, refresh } = useWorkbenchData();
  const filters = useFilters();
  const navigate = useNavigate();
  const [view, setView] = useState('appointment');
  // Set when a review indicator sends HR to the history-derived candidates for one appointment.
  const [historyLabel, setHistoryLabel] = useState('');
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [showContingency, setShowContingency] = useState(false);
  const [contingencyPersonId, setContingencyPersonId] = useState('');
  const [contingencyReason, setContingencyReason] = useState(DROPOUT_REASONS[0]);
  const [contingencyResult, setContingencyResult] = useState(null);
  const [showFillSlots, setShowFillSlots] = useState(false);
  const [fillRunning, setFillRunning] = useState(false);
  const [fillSummary, setFillSummary] = useState(null);

  const filteredEmployees = useMemo(() => employees.filter(e => matchesFilters(e, filters)), [employees, filters]);

  // Build chains for all plans
  const chains = useMemo(() => {
    return successionPlans.map(plan => ({
      plan,
      chain: buildSuccessionChain(plan, employees, appointments),
      depth: classifySuccessionDepth(plan, employees, appointments)
    }));
  }, [successionPlans, employees, appointments]);

  // Risk summary
  const riskSummary = useMemo(() => buildSuccessionRiskSummary(successionPlans, employees, appointments), [successionPlans, employees, appointments]);

  // Appointments already carrying a succession plan — quick picks for linkage testing.
  const plannedAppointments = useMemo(
    () => [...new Set(successionPlans.map(p => p.appointment_title).filter(Boolean))],
    [successionPlans]
  );

  // Competing demand
  const competingDemand = useMemo(() => detectCompetingDemand(successionPlans), [successionPlans]);

  // Individual-centric: map each person to their succession roles
  const personSuccessionMap = useMemo(() => {
    return filteredEmployees.map(e => ({
      person: e,
      roles: findPersonInSuccessionPlans(e.employee_id, successionPlans)
    })).filter(p => p.roles.length > 0);
  }, [filteredEmployees, successionPlans]);

  const handleContingency = () => {
    if (!contingencyPersonId) return;
    const result = analyzeContingency(contingencyPersonId, successionPlans, employees, appointments);
    setContingencyResult(result);
    setShowContingency(false);
  };

  // Populates the empty primary/alternate slots of every plan from recorded appointment history.
  const handleFillSlots = async () => {
    setFillRunning(true);
    try {
      const results = await fillSuccessionSlotsFromHistory({ plans: successionPlans, employees, appointments });
      const filled = results.filter(r => r.status === 'filled');
      const slots = filled.reduce((n, r) => n + r.filled, 0);
      const noCandidates = results.filter(r => r.status === 'no-candidates').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      setFillSummary(
        `${filled.length} appointment(s) updated — ${slots} successor slot(s) filled from recorded history.` +
        (noCandidates ? ` ${noCandidates} appointment(s) had no recorded feeder candidates.` : '') +
        (skipped ? ` ${skipped} plan(s) were already fully populated and left unchanged.` : '') +
        ' HR confirmation required.'
      );
      await refresh();
    } finally {
      setFillRunning(false);
      setShowFillSlots(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Succession Planning</h1>
            <AIPill />
          </div>
          <p className="text-sm text-muted-foreground">Succession depth, dependency mapping and contingency management. AI identifies — HR decides.</p>
        </div>
        <button
          onClick={() => setShowContingency(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-review bg-amber-50 px-3 py-1.5 text-xs font-medium text-review hover:bg-amber-100"
        >
          <UserX className="h-3.5 w-3.5" /> Trigger Contingency
        </button>
      </div>

      {/* Succession conflict alert */}
      {competingDemand.length > 0 && (
        <div className="mb-4 rounded-sm border border-review bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-review" />
            <h3 className="text-sm font-semibold text-review">Succession Conflict Alert — Competing Demand Detected</h3>
            <span className="rounded-sm bg-review px-1.5 py-0.5 text-[0.625rem] font-semibold text-review-foreground">{competingDemand.length}</span>
          </div>
          <p className="mt-1.5 text-xs text-foreground">
            {competingDemand.length} individual(s) are identified as successors for multiple appointments. Moving any of them reduces succession coverage elsewhere.
          </p>
          <div className="mt-2 space-y-1.5">
            {competingDemand.map(cd => (
              <div key={cd.personId} className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card px-3 py-2">
                <span className="text-sm font-medium text-foreground">{cd.personName || cd.personId}</span>
                <span className="text-xs text-muted-foreground">— competing demand as successor for:</span>
                <div className="flex flex-wrap gap-1">
                  {cd.entries.map((e, i) => (
                    <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">
                      {e.plan.appointment_title} ({e.role})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.6875rem] text-muted-foreground">Review the Individual-Centric or Succession Risk tab for full details. HR must resolve conflicts manually.</p>
        </div>
      )}

      {/* Depth summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {['Healthy', 'Limited', 'At Risk', 'Vacant/Critical'].map(depth => (
          <div key={depth} className={`rounded-sm border border-border border-l-4 bg-card px-4 py-3 ${
            depth === 'Healthy' ? 'border-l-ready' : depth === 'Limited' ? 'border-l-amber-400' : depth === 'At Risk' ? 'border-l-review' : 'border-l-destructive'
          }`}>
            <p className="font-mono text-2xl font-semibold leading-none text-mono-value">{riskSummary.depthCounts[depth] || 0}</p>
            <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">{depth}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="mb-4 flex rounded-sm border border-border bg-card p-0.5">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <v.icon className="h-3.5 w-3.5" /> {v.label}
          </button>
        ))}
      </div>

      {/* Contingency result */}
      {contingencyResult && (
        <div className="mb-5 rounded-sm border border-review bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-review" />
            <h3 className="text-sm font-semibold text-review">Contingency Analysis — HR Review Required</h3>
          </div>
          <p className="mt-1.5 text-xs text-foreground">
            <span className="font-medium">{contingencyResult.unavailablePerson?.name}</span> ({contingencyResult.unavailablePerson?.employee_id}) marked unavailable.
            {' '}<MonoValue>{contingencyResult.affectedPlans.length}</MonoValue> appointment(s) affected.
          </p>

          {contingencyResult.circularDetected && (
            <div className="mt-2 flex items-center gap-2 rounded-sm border border-destructive bg-red-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-semibold text-destructive">CIRCULAR SUCCESSION DEPENDENCY — HR REVIEW REQUIRED</span>
            </div>
          )}

          <div className="mt-3 space-y-3">
            {contingencyResult.scenarios.map((sc, i) => (
              <div key={i} className="rounded-sm border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{sc.plan.appointment_title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Role vacated: {sc.unavailableRole}</span>
                  </div>
                  <StatusBadge status={classifySuccessionDepth(sc.plan, employees, appointments)} />
                </div>

                {sc.promotionCandidate && (
                  <div className="mt-2">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Next Viable Candidate</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{sc.promotionCandidate.name}</span>
                      <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${sc.promotionCandidate.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{sc.promotionCandidate.satisfactionPct}%</span>
                      {sc.promotionCandidate.readiness === 'Ready' ? <ReadyPill>{sc.promotionCandidate.readiness}</ReadyPill> : (
                        <ReviewPill
                          onClick={() => navigate(profileTabPath(sc.promotionCandidate.id, tabForText(sc.promotionCandidate.readiness), reviewFocus(sc.promotionCandidate.matchResult, sc.promotionCandidate.readiness)))}
                          title={`Open ${sc.promotionCandidate.name}'s profile at the tab holding what needs review`}
                        >{sc.promotionCandidate.readiness}</ReviewPill>
                      )}
                    </div>
                  </div>
                )}

                {sc.competingDemand && sc.competingDemand.length > 0 && (
                  <div className="mt-2 rounded-sm border border-review bg-amber-50/50 p-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-review" />
                      <span className="text-xs font-semibold text-review">SUCCESSION CONFLICT</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground">
                      {sc.promotionCandidate?.name} is currently a successor for:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {sc.competingDemand.map((cd, j) => (
                        <li key={j} className="text-xs text-foreground">• {cd.plan.appointment_title} — as {cd.role}</li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs text-muted-foreground">Moving this candidate may reduce succession coverage for the above appointment(s).</p>
                  </div>
                )}

                {sc.newCandidates.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Newly Eligible Candidates (not previously shortlisted)</p>
                    <div className="mt-1 space-y-1">
                      {sc.newCandidates.map((nc, j) => (
                        <div key={j} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{nc.person.name} ({nc.person.employee_id})</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${nc.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{nc.satisfactionPct}%</span>
                            {nc.status === 'Eligible' ? <ReadyPill>{nc.readiness}</ReadyPill> : (
                              <ReviewPill
                                onClick={() => navigate(profileTabPath(nc.person.employee_id, tabForText(nc.status), reviewFocus(nc, nc.status)))}
                                title={`Open ${nc.person.name}'s profile at the tab holding what needs review`}
                              >{nc.status}</ReviewPill>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!sc.promotionCandidate && sc.newCandidates.length === 0 && (
                  <p className="mt-2 text-xs text-destructive">No viable replacement identified — appointment may become uncovered.</p>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            The system will NOT automatically implement any replacement. HR must review and confirm all changes.
          </p>
          <button onClick={() => setContingencyResult(null)} className="mt-2 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            Dismiss
          </button>
        </div>
      )}

      {/* ==================== APPOINTMENT-CENTRIC VIEW ==================== */}
      {view === 'appointment' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Succession Chains</h3>
              <p className="text-xs text-muted-foreground">
                Primary, Alternate 1 and Alternate 2 are populated from recorded appointment history — the appointments that have historically fed into each one.
              </p>
            </div>
            <button
              onClick={() => setShowFillSlots(true)}
              disabled={fillRunning || successionPlans.length === 0}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" /> {fillRunning ? 'Identifying candidates…' : 'Fill Slots From History'}
            </button>
          </div>

          {fillSummary && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-secondary/40 px-4 py-3">
              <p className="text-xs text-foreground">{fillSummary}</p>
              <button onClick={() => setFillSummary(null)} className="text-xs font-medium text-primary hover:underline">Dismiss</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {chains.map(({ plan, chain, depth }) => (
              <SuccessionChain
                key={plan.id}
                plan={plan}
                chain={chain}
                depth={depth}
                onReviewBasis={p => { setHistoryLabel(p.appointment_title || ''); setView('history'); }}
              />
            ))}
            {chains.length === 0 && (
              <div className="col-span-2 rounded-sm border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                No succession plans configured. Succession plans link appointments to their identified successors.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== INDIVIDUAL-CENTRIC VIEW ==================== */}
      {view === 'individual' && (
        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Individual Succession Roles</h3>
            <p className="text-xs text-muted-foreground">Where each person appears in succession pipelines — identifies competing demand</p>
          </div>
          <div className="divide-y divide-border">
            {personSuccessionMap.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No individuals currently identified in succession plans.</div>
            )}
            {personSuccessionMap.map(({ person, roles }) => (
              <div key={person.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{person.name}</span>
                    <span className="ml-2 font-mono text-[0.6875rem] text-muted-foreground">{person.employee_id} · {person.rank} · {person.vocation}</span>
                  </div>
                  {roles.length > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-review">
                      <AlertTriangle className="h-3 w-3" /> Competing Demand ({roles.length})
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles.map(({ plan, role }, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/50 px-2 py-1 text-xs">
                      <span className="font-medium text-foreground">{plan.appointment_title}</span>
                      <span className="text-muted-foreground">— {role}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== HISTORY-DERIVED CANDIDATES VIEW ==================== */}
      {view === 'history' && <HistoryCandidateSuggestions employees={employees} quickPicks={plannedAppointments} initialLabel={historyLabel} />}

      {/* ==================== RISK VIEW ==================== */}
      {view === 'risk' && (
        <div className="space-y-4">
          {/* Competing demand */}
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <GitBranch className="h-4 w-4 text-review" />
              <h3 className="text-sm font-semibold text-foreground">Competing Appointment Demand</h3>
            </div>
            <div className="divide-y divide-border">
              {competingDemand.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No competing demand detected.</div>}
              {competingDemand.map(cd => (
                <div key={cd.personId} className="px-4 py-3">
                  <div className="text-sm font-medium text-foreground">{cd.personName || cd.personId}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {cd.entries.map((e, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/50 px-2 py-1 text-xs">
                        <span className="font-medium text-foreground">{e.plan.appointment_title}</span>
                        <span className="text-muted-foreground">— {e.role}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* At-risk appointments */}
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Succession Risk — At Risk & Vacant/Critical</h3>
            </div>
            <div className="divide-y divide-border">
              {riskSummary.risks.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No succession risks identified.</div>}
              {riskSummary.risks.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{r.appointment_title}</span>
                  <StatusBadge status={r.depth} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fill successor slots dialog */}
      {showFillSlots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowFillSlots(false)}>
          <div className="mx-4 w-full max-w-lg rounded-sm border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Fill Successor Slots From Recorded History</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              For each of the <span className="font-medium text-foreground">{successionPlans.length}</span> appointment(s) with a succession plan, the system identifies the closest candidates from the appointments that have historically fed into it, then populates Primary Successor, Alternate 1 and Alternate 2.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• Slots HR has already filled are never overwritten.</li>
              <li>• No one is placed in two slots of the same plan.</li>
              <li>• Personnel who have already held the appointment are excluded.</li>
              <li>• Every field change is written to the audit trail with its recorded-history basis.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">These are history-derived indications for linkage testing — they are not approved successors. HR confirmation remains required.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowFillSlots(false)} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
              <button onClick={handleFillSlots} disabled={fillRunning} className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {fillRunning ? 'Identifying candidates…' : 'Fill Slots'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contingency dialog */}
      {showContingency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowContingency(false)}>
          <div className="mx-4 w-full max-w-md rounded-sm border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-review" />
              <h3 className="text-base font-semibold text-foreground">Trigger Contingency — Person Unavailable</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a person who has become unavailable. The system will identify every affected appointment and succession pipeline, re-run eligibility, and present replacement scenarios for HR review.
            </p>
            <div className="mt-4">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual</label>
              <select
                value={contingencyPersonId}
                onChange={e => setContingencyPersonId(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select a person…</option>
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{e.name} — {e.rank} {e.vocation} ({e.employee_id})</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Reason</label>
              <select
                value={contingencyReason}
                onChange={e => setContingencyReason(e.target.value)}
                className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {DROPOUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowContingency(false)} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
              <button onClick={handleContingency} disabled={!contingencyPersonId} className="rounded-sm bg-review px-3 py-1.5 text-xs font-medium text-review-foreground hover:bg-review/90 disabled:opacity-50 disabled:cursor-not-allowed">Run Contingency Analysis</button>
            </div>
            <p className="mt-3 text-[0.6875rem] text-muted-foreground">The system will NOT automatically implement any changes. HR review required.</p>
          </div>
        </div>
      )}
    </div>
  );
}