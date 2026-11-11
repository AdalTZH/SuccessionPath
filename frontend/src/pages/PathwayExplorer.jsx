import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { pct, tenureLabel, confidenceLabel } from '@/lib/pathwayHistoryEngine';
import useCatalogueSearch from '@/lib/useCatalogueSearch';
import PathwayFlowDiagram from '@/components/explorer/PathwayFlowDiagram';
import IndividualPathwayView from '@/components/explorer/IndividualPathwayView';
import AppointmentHoldersPanel from '@/components/explorer/AppointmentHoldersPanel';
import { Section } from '@/components/profile/ProfileSections';
import { AIPill, MonoValue, ReviewPill, SectionLabel } from '@/components/badges';
import { Search, User, Briefcase, ChevronRight } from 'lucide-react';

const MODES = [
  { key: 'individual', label: 'Individual Pathway', icon: User, hint: 'One person’s recorded appointment sequence, earliest to current' },
  { key: 'appointment', label: 'Appointment Linkage', icon: Briefcase, hint: 'Observed arrivals into and departures from an appointment' }
];

function ResultRow({ primary, secondary, right, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left hover:bg-secondary"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{primary}</span>
        {secondary && <span className="block truncate font-mono text-[0.625rem] text-muted-foreground">{secondary}</span>}
      </span>
      {right && <span className="shrink-0 text-[0.625rem] text-muted-foreground">{right}</span>}
    </button>
  );
}

export default function PathwayExplorer() {
  const { employees, loading: employeesLoading } = useWorkbenchData();
  const [mode, setMode] = useState('individual');

  // Date of birth per personnel number, so each recorded holding can show the age on appointment.
  const dobByEmployee = useMemo(() => new Map(employees.map(e => [e.employee_id, e.dob])), [employees]);

  const [empQuery, setEmpQuery] = useState('');
  const [apptQuery, setApptQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState(null);

  const [history, setHistory] = useState([]);
  const [pathway, setPathway] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // The appointment panel browses the whole imported catalogue — server-paged as the list is scrolled.
  const appt = useCatalogueSearch({ term: apptQuery, enabled: mode === 'appointment' });

  // Deep link from the appointments catalogue, e.g. /pathway-explorer?label=…
  useEffect(() => {
    const label = new URLSearchParams(window.location.search).get('label');
    if (!label) return;
    setMode('appointment');
    setApptQuery(label);
    openAppointment(label);
  }, []);

  // Deep link from a trigger case, e.g. /pathway-explorer?employee=PER001
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('employee');
    if (!id || selectedEmployee) return;
    const person = employees.find(e => e.employee_id === id);
    if (person) openIndividual(person);
  }, [employees]);

  const openIndividual = async (emp) => {
    setSelectedEmployee(emp);
    setSelectedLabel(null);
    setDetailLoading(true);
    setHistory([]);
    setPathway(null);
    try {
      const page = await base44.entities.AppointmentHistory.filter({ employee_id: emp.employee_id }, { sort: 'sequence', limit: 200 });
      const rows = page.items || [];
      setHistory(rows);
      const current = rows.find(r => r.is_current);
      if (current) {
        const pw = await base44.entities.AppointmentPathway.filter({ label: current.appointment }, { limit: 1 });
        setPathway((pw.items || [])[0] || null);
      }
    } catch { /* surfaced as empty state */ }
    setDetailLoading(false);
  };

  const openAppointment = async (label) => {
    setSelectedLabel(label);
    setSelectedEmployee(null);
    setDetailLoading(true);
    setHistory([]);
    setPathway(null);
    try {
      const [hist, pw] = await Promise.all([
        base44.entities.AppointmentHistory.filter({ appointment: label }, { sort: '-start_date', limit: 400 }),
        base44.entities.AppointmentPathway.filter({ label }, { limit: 1 })
      ]);
      setHistory(hist.items || []);
      setPathway((pw.items || [])[0] || null);
    } catch { /* surfaced as empty state */ }
    setDetailLoading(false);
  };

  const empResults = empQuery.trim()
    ? employees.filter(e => `${e.name} ${e.employee_id} ${e.rank} ${e.vocation}`.toLowerCase().includes(empQuery.trim().toLowerCase())).slice(0, 12)
    : [];
  const activeMode = MODES.find(m => m.key === mode);
  const conf = confidenceLabel(pathway?.transition_sample_size);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Historical Career Pathway Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Observed progression built from the imported appointment history — who held what, in what order, and where they moved next.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card p-1">
        {MODES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <m.icon className="h-3.5 w-3.5" /> {m.label}
          </button>
        ))}
        <span className="ml-1 hidden text-[0.6875rem] text-muted-foreground sm:inline">{activeMode.hint}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <Section title={mode === 'individual' ? 'Select Personnel' : 'Select Appointment'} subtitle={mode === 'individual' ? 'Search the authorised population' : 'Search the imported catalogue'}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={mode === 'individual' ? empQuery : apptQuery}
              onChange={e => (mode === 'individual' ? setEmpQuery(e.target.value) : setApptQuery(e.target.value))}
              placeholder={mode === 'individual' ? 'Name, employee ID, rank…' : 'Appointment label…'}
              className="w-full rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div
            className="mt-2 max-h-[26rem] overflow-y-auto"
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) appt.loadMore();
            }}
          >
            {mode === 'individual' && (
              employeesLoading ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">Loading personnel…</p>
              ) : !empQuery.trim() ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">Start typing to find an individual. {employees.length.toLocaleString()} personnel in the migrated population.</p>
              ) : empResults.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">No personnel match “{empQuery}”.</p>
              ) : empResults.map(e => (
                <ResultRow
                  key={e.id}
                  primary={e.name}
                  secondary={`${e.employee_id} · ${e.rank} · ${e.appointment_count || 0} appts`}
                  onClick={() => openIndividual(e)}
                />
              ))
            )}

            {mode === 'appointment' && (
              appt.loading ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">Loading appointment catalogue…</p>
              ) : appt.rows.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">No appointment matches “{apptQuery}”.</p>
              ) : (
                <div className="space-y-0.5">
                  <p className="px-1 pb-1 text-xs text-muted-foreground">
                    {apptQuery.trim()
                      ? `${appt.rows.length} of ${appt.total.toLocaleString()} matches${appt.hasMore ? ' — scroll for more' : ''}`
                      : `All ${appt.total.toLocaleString()} appointment labels in the imported source, most held first — scroll to browse them all.`}
                  </p>
                  {appt.rows.map(c => (
                    <ResultRow key={c.id || c.label} primary={c.label} secondary={`${c.distinct_employees || 0} personnel · ${c.current_holders || 0} current`} right={`${c.usage_count || 0}`} onClick={() => openAppointment(c.label)} />
                  ))}
                  {appt.loadingMore && <p className="px-1 py-2 text-xs text-muted-foreground">Loading more appointments…</p>}
                  {!appt.hasMore && <p className="px-1 pt-2 text-[0.625rem] text-muted-foreground">All {appt.total.toLocaleString()} appointment labels listed.</p>}
                </div>
              )
            )}
          </div>
        </Section>

        <div className="space-y-4">
          {detailLoading && (
            <div className="flex h-40 items-center justify-center rounded-sm border border-border bg-card">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-secondary border-t-primary" />
            </div>
          )}

          {!detailLoading && mode === 'individual' && !selectedEmployee && (
            <div className="rounded-sm border border-border bg-card p-8 text-center">
              <User className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Select an individual to see their recorded appointment sequence and observed next moves.</p>
            </div>
          )}

          {!detailLoading && mode === 'individual' && selectedEmployee && (
            <>
              <Section
                title={selectedEmployee.name}
                subtitle={`${selectedEmployee.employee_id} · ${selectedEmployee.rank} · ${selectedEmployee.vocation}`}
                action={<Link to={`/people/${selectedEmployee.employee_id}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">Open profile <ChevronRight className="h-3 w-3" /></Link>}
              >
                <IndividualPathwayView history={history} onSelectAppointment={label => { setMode('appointment'); setApptQuery(label); openAppointment(label); }} />
              </Section>

              {pathway && (
                <Section title="Observed Next Moves" subtitle={`Where personnel who held “${pathway.label}” went next`} action={<AIPill />}>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewPill>{conf.text}</ReviewPill>
                    <span className="text-xs text-muted-foreground">
                      Based on <MonoValue>{pathway.transition_sample_size ?? 0}</MonoValue> recorded transitions. Descriptive of this population only.
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(pathway.typical_successors || []).length === 0 && <p className="text-sm text-muted-foreground">No onward moves recorded for this appointment.</p>}
                    {(pathway.typical_successors || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-sm border border-border px-2.5 py-1.5">
                        <button type="button" onClick={() => { setMode('appointment'); setApptQuery(s.label); openAppointment(s.label); }} className="truncate text-left text-sm text-foreground hover:text-primary hover:underline">
                          {s.label}
                        </button>
                        <span className="shrink-0 text-[0.6875rem] text-muted-foreground"><MonoValue>{s.count}</MonoValue> personnel · {pct(s.share)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {!detailLoading && mode === 'appointment' && !selectedLabel && (
            <div className="rounded-sm border border-border bg-card p-8 text-center">
              <Briefcase className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Select an appointment to see its observed arrivals, departures and recorded holders.</p>
            </div>
          )}

          {!detailLoading && mode === 'appointment' && selectedLabel && (
            <>
              <Section
                title={selectedLabel}
                subtitle="Observed appointment linkage — arrivals, departures and recorded holders"
                action={<AIPill />}
              >
                <PathwayFlowDiagram
                  focusLabel={selectedLabel}
                  focusSub={pathway ? `${pathway.total_holdings} holdings · ${pathway.distinct_holders} personnel` : ''}
                  predecessors={pathway?.typical_predecessors || []}
                  successors={pathway?.typical_successors || []}
                />
              </Section>

              <Section title="Recorded Holders & Tenure" subtitle="Every recorded holding of this appointment in the source">
                <AppointmentHoldersPanel pathway={pathway} holders={history} dobByEmployee={dobByEmployee} />
              </Section>

              {pathway && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-sm border border-border bg-card px-3 py-2.5">
                    <SectionLabel>Tenure Range</SectionLabel>
                    <p className="mt-0.5 text-sm text-foreground">
                      <MonoValue>{tenureLabel(pathway.min_tenure_months)}</MonoValue> → <MonoValue>{tenureLabel(pathway.max_tenure_months)}</MonoValue>
                    </p>
                  </div>
                  <div className="rounded-sm border border-border bg-card px-3 py-2.5">
                    <SectionLabel>Median Tenure</SectionLabel>
                    <p className="mt-0.5 text-sm"><MonoValue>{tenureLabel(pathway.median_tenure_months)}</MonoValue></p>
                  </div>
                  <div className="rounded-sm border border-border bg-card px-3 py-2.5">
                    <SectionLabel>Earliest Recorded</SectionLabel>
                    <p className="mt-0.5 font-mono text-sm text-foreground">{pathway.first_start_date || '—'}</p>
                  </div>
                  <div className="rounded-sm border border-border bg-card px-3 py-2.5">
                    <SectionLabel>Latest Recorded</SectionLabel>
                    <p className="mt-0.5 font-mono text-sm text-foreground">{pathway.latest_start_date || '—'}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
        Pathway patterns are drawn from recorded history only. They describe what has happened in the imported population — they are never a rule, a prediction, or a recommendation to HR.
      </p>
    </div>
  );
}