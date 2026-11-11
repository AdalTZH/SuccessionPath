import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { useFilters, matchesFilters, matchesAppointmentTag } from '@/lib/FilterContext';
import { MonoValue, ReadyPill, ReviewPill } from '@/components/badges';
import { Search, ChevronRight } from 'lucide-react';

export default function People() {
  const { employees, appointments, loading } = useWorkbenchData();
  const filters = useFilters();
  const [query, setQuery] = React.useState('');

  // Grooming tier per appointment label — shown beside the appointment, e.g. "… (P2)".
  const tierByLabel = useMemo(() => Object.fromEntries(
    (appointments || []).filter(a => a.grooming_tier).map(a => [a.appointment_id, a.grooming_tier])
  ), [appointments]);

  // Appointment tags (grooming tier, speciality) so a person can be called up by the tag on the
  // appointment they hold.
  const appointmentTagByLabel = useMemo(() => Object.fromEntries(
    (appointments || []).map(a => [a.appointment_id, { tier: a.grooming_tier || '', speciality: a.speciality || '' }])
  ), [appointments]);

  const rows = useMemo(() => employees.filter(e =>
    matchesFilters(e, filters) &&
    matchesAppointmentTag(e, filters.tag, appointmentTagByLabel) &&
    (!query || `${e.name} ${e.employee_id} ${e.current_appointment}`.toLowerCase().includes(query.toLowerCase()))
  ), [employees, filters, query, appointmentTagByLabel]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">People</h1>
          <p className="text-sm text-muted-foreground">Consolidated personnel profiles — data from multiple eHR sources combined by Employee ID.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, ID, appointment…"
            className="w-72 rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left">
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Vocation</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Organisation</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Current Appointment</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Available From</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">HR Tags</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && rows.map(e => {
              const avail = e.posting_availability;
              const hasAvail = avail && avail.earliest_posting_date;
              return (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-2.5">
                    <Link to={`/people/${e.employee_id}`} className="font-medium text-foreground hover:text-primary">{e.name}</Link>
                    <div className="font-mono text-[0.6875rem] text-muted-foreground">{e.employee_id}</div>
                  </td>
                  <td className="px-4 py-2.5"><MonoValue>{e.rank}</MonoValue></td>
                  <td className="px-4 py-2.5 text-foreground">{e.vocation}</td>
                  <td className="px-4 py-2.5 text-foreground">{e.organisation}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{e.current_appointment}</span>
                      {tierByLabel[e.current_appointment] && (
                        <span
                          title="P1/P2 grooming appointment."
                          className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground"
                        >
                          Grooming {tierByLabel[e.current_appointment]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {hasAvail ? (
                      <div>
                        <MonoValue>{avail.earliest_posting_date}</MonoValue>
                        {avail.availability === 'Available Soon' && <span className="ml-1 text-[0.625rem] font-medium text-review">Soon</span>}
                        {(avail.posting_restrictions || []).length > 0 && <div className="text-[0.625rem] text-review">Restricted</div>}
                      </div>
                    ) : <ReviewPill>Missing</ReviewPill>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(e.hr_tags || []).map(t => (
                        <span key={t} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{t}</span>
                      ))}
                      {(e.hr_tags || []).length === 0 && <span className="text-[0.625rem] text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/people/${e.employee_id}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
                      Profile <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {rows.length} individuals{filters.tag !== 'All' && ` tagged ${filters.tag}`}
      </p>
    </div>
  );
}