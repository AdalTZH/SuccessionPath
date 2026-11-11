import React, { useMemo, useState } from 'react';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { useFilters, matchesFilters } from '@/lib/FilterContext';
import { MonoValue, StatusBadge, SectionLabel, AIPill } from '@/components/badges';
import { Search } from 'lucide-react';

const DEV_STATUSES = ['All', 'Planned', 'Nominated', 'Enrolled', 'Completed', 'Deferred'];

export default function Development() {
  const { developmentPlans, courses, employees, loading } = useWorkbenchData();
  const filters = useFilters();
  const [tab, setTab] = useState('plans');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredDevs = useMemo(() => developmentPlans.filter(d =>
    (statusFilter === 'All' || d.status === statusFilter) &&
    (!query || `${d.employee_name} ${d.target_appointment}`.toLowerCase().includes(query.toLowerCase()))
  ), [developmentPlans, statusFilter, query]);

  const filteredCourses = useMemo(() => courses.filter(c =>
    !query || `${c.course_name} ${c.course_id} ${c.provider}`.toLowerCase().includes(query.toLowerCase())
  ), [courses, query]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Development & Course Planning</h1>
          <p className="text-sm text-muted-foreground">Link skills gaps to development interventions and course nominations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-64 rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('plans')}
          className={`px-3 py-2 text-sm font-medium ${tab === 'plans' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Development Plans ({developmentPlans.length})
        </button>
        <button
          onClick={() => setTab('courses')}
          className={`px-3 py-2 text-sm font-medium ${tab === 'courses' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Course Library ({courses.length})
        </button>
      </div>

      {tab === 'plans' && (
        <>
          {statusFilter !== 'All' && (
            <button onClick={() => setStatusFilter('All')} className="mb-2 text-xs font-medium text-primary hover:underline">
              Clear status filter: {statusFilter} ×
            </button>
          )}
          <div className="overflow-x-auto rounded-sm border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left">
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Target Appointment</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Readiness</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Skills Gap</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Recommended Intervention</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Target Date</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Owner</th>
                  <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevs.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No development plans match the current filters.</td></tr>
                )}
                {filteredDevs.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground">{d.employee_name}</div>
                      <div className="font-mono text-[0.6875rem] text-muted-foreground">{d.employee_id}</div>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{d.target_appointment}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${d.current_readiness === 'Ready' ? 'text-ready' : d.current_readiness === 'Ready with Development' ? 'text-review' : d.current_readiness === 'Longer-term' ? 'text-review' : 'text-muted-foreground'}`}>
                        {d.current_readiness}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {(d.skills_gap || []).map((g, i) => (
                        <div key={i} className="text-xs text-foreground">
                          {g.skill}: <MonoValue>{g.current}</MonoValue>→<MonoValue>{g.required}</MonoValue> <span className="text-review">({g.gap > 0 ? `+${g.gap}` : g.gap})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-foreground">{d.recommended_development}</div>
                      {d.course_intervention && <div className="text-xs text-primary">{d.course_intervention}</div>}
                    </td>
                    <td className="px-4 py-2.5"><MonoValue>{d.target_completion_date || '—'}</MonoValue></td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{d.owner || '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'courses' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCourses.map(c => (
            <div key={c.id} className="rounded-sm border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{c.course_name}</h3>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{c.course_id} · {c.provider}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {c.course_type && (
                    <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${
                      c.course_type === 'Mandatory Prerequisite' ? 'bg-red-50 text-destructive' :
                      c.course_type === 'Readiness-enhancing' ? 'bg-amber-50 text-review' :
                      'bg-blue-50 text-blue-600'
                    }`}>{c.course_type}</span>
                  )}
                  <AIPill />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div><SectionLabel>Duration</SectionLabel><p className="mt-0.5 text-foreground">{c.duration || '—'}</p></div>
                <div><SectionLabel>Capacity</SectionLabel><p className="mt-0.5 text-foreground"><MonoValue>{c.capacity || '—'}</MonoValue></p></div>
                <div><SectionLabel>Target Population</SectionLabel><p className="mt-0.5 text-foreground">{c.target_population || '—'}</p></div>
                <div><SectionLabel>Proficiency Gain</SectionLabel><p className="mt-0.5 text-foreground"><MonoValue>+{c.expected_proficiency_gain || 1}</MonoValue></p></div>
              </div>
              <div className="mt-2 rounded-sm bg-amber-50 px-2.5 py-1.5">
                <p className="text-[0.625rem] text-review">Course completion = evidence of development, not automatic proficiency (Rule 13). Skill validation requires demonstrated application.</p>
              </div>
              <div className="mt-3 border-t border-border pt-2.5">
                <SectionLabel>Skills Developed</SectionLabel>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(c.skills_developed || []).map(s => (
                    <span key={s} className="rounded-sm bg-ai-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-ai">{s}</span>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <SectionLabel>Qualification Awarded</SectionLabel>
                <p className="mt-0.5 text-xs text-foreground">{c.qualification_awarded || '—'}</p>
              </div>
              <div className="mt-2">
                <SectionLabel>Prerequisites</SectionLabel>
                <p className="mt-0.5 text-xs text-foreground">{(c.prerequisites || []).join(', ') || 'None'}</p>
              </div>
              <div className="mt-2">
                <SectionLabel>Course Dates</SectionLabel>
                <div className="mt-0.5 flex flex-wrap gap-2">
                  {(c.course_dates || []).map(d => <MonoValue key={d} className="text-xs">{d}</MonoValue>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}