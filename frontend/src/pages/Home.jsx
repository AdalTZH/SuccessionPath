import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { useFilters, matchesFilters, appointmentMatchesFilters } from '@/lib/FilterContext';
import { postingDashboard } from '@/lib/workbench';
import { caseActionRows } from '@/lib/triggerCases';
import { groomingCases } from '@/lib/grooming';
import { Briefcase, UserX, UserCheck, Clock, FileWarning, GraduationCap, CalendarClock, AlertTriangle } from 'lucide-react';

function DashboardCard({ icon: Icon, label, value, tone, onClick }) {
  const toneCls = {
    navy: 'border-l-primary',
    amber: 'border-l-review',
    emerald: 'border-l-ready',
    slate: 'border-l-muted-foreground'
  }[tone] || 'border-l-border';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-sm border border-border border-l-4 ${toneCls} bg-card px-4 py-3 text-left transition-colors hover:bg-secondary`}
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-mono text-2xl font-semibold leading-none text-mono-value">{value}</p>
        <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

export default function Home() {
  const { employees, appointments, postingAssignments, actions, loading } = useWorkbenchData();
  const filters = useFilters();
  const navigate = useNavigate();

  const filteredEmployees = useMemo(() => employees.filter(e => matchesFilters(e, filters)), [employees, filters]);

  // With a population selected, the appointment scope is the workbook appointments that population
  // currently holds, so every metric answers for the population pool in the bar above.
  const populationScoped = filters.vocation !== 'All' || filters.rank !== 'All' || filters.org !== 'All';
  const inScopeLabels = useMemo(
    () => new Set(filteredEmployees.map(e => e.current_appointment).filter(Boolean)),
    [filteredEmployees]
  );
  const filteredAppointments = useMemo(
    () => appointments.filter(a => appointmentMatchesFilters(a, filters) && (!populationScoped || inScopeLabels.has(a.appointment_id))),
    [appointments, filters, populationScoped, inScopeLabels]
  );
  const filteredAssignmentIds = useMemo(() => new Set(filteredAppointments.map(a => a.appointment_id)), [filteredAppointments]);
  const filteredAssignments = useMemo(() => postingAssignments.filter(pa => filteredAssignmentIds.has(pa.appointment_id)), [postingAssignments, filteredAssignmentIds]);

  const metrics = useMemo(() => postingDashboard(filteredAppointments, filteredAssignments, filteredEmployees), [filteredAppointments, filteredAssignments, filteredEmployees]);
  // Persisted trigger cases from the planning workbook — the full list lives under Actions.
  const caseRows = useMemo(() => {
    const byId = new Map(employees.map(e => [e.employee_id, e]));
    return caseActionRows(actions).filter(r => {
      const emp = byId.get(r.individualId);
      return emp ? matchesFilters(emp, filters) : true;
    });
  }, [actions, employees, filters]);

  // Grooming rule: talent + wrangler individuals belong in a P1/P2 appointment, and a non-talent
  // placed in one needs an override. Both are worked from the People page.
  const groomingCount = useMemo(() => {
    const tierEntryByLabel = Object.fromEntries((appointments || []).filter(a => a.grooming_tier).map(a => [a.appointment_id, a]));
    const cases = groomingCases(
      (postingAssignments || []).filter(p => p.primary_candidate_id && p.status !== 'Replacement Required'),
      employees,
      tierEntryByLabel
    );
    return cases.placements.length + cases.unplaced.length;
  }, [appointments, postingAssignments, employees]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">Posting Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          What postings require action today? — {inScopeLabels.size.toLocaleString()} appointments currently held{populationScoped ? ' by the selected population' : ''}.
          Individual cases are worked under Actions. The workbook's full label list ({appointments.length.toLocaleString()}) is browsable under Appointments.
        </p>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardCard icon={Briefcase} label={populationScoped ? 'Appointments In Scope' : 'Appointments In Use'} value={inScopeLabels.size} tone="navy" onClick={() => navigate('/appointments')} />
        <DashboardCard icon={FileWarning} label="Without Candidate" value={metrics.withoutCandidate} tone="amber" onClick={() => navigate('/posting-workbench')} />
        <DashboardCard icon={UserCheck} label="Candidates Identified" value={metrics.candidatesIdentified} tone="emerald" onClick={() => navigate('/posting-workbench')} />
        <DashboardCard icon={Clock} label="Pending Confirmation" value={metrics.pendingConfirmation} tone="slate" onClick={() => navigate('/posting-workbench')} />
        <DashboardCard icon={UserCheck} label="Confirmed Postings" value={metrics.confirmedPostings} tone="emerald" onClick={() => navigate('/appointments')} />
        <DashboardCard icon={UserX} label="Replacement Required" value={metrics.replacementRequired} tone="amber" onClick={() => navigate('/posting-workbench')} />
        <DashboardCard icon={Clock} label="Becoming Available" value={metrics.becomingAvailable} tone="slate" onClick={() => navigate('/people')} />
        <DashboardCard icon={CalendarClock} label="Trigger Cases" value={caseRows.length} tone="amber" onClick={() => navigate('/actions')} />
        <DashboardCard icon={GraduationCap} label="Dev Gaps to Action" value={metrics.devGapsRequiringAction} tone="amber" onClick={() => navigate('/development')} />
        <DashboardCard icon={AlertTriangle} label="Grooming Mismatch" value={groomingCount} tone="amber" onClick={() => navigate('/people')} />
      </div>
    </div>
  );
}