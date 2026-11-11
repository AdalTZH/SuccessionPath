import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge, MonoValue, SectionLabel, AIPill } from '@/components/badges';
import { findPersonInSuccessionPlans } from '@/lib/successionEngine';
import { fetchPathways } from '@/lib/appointmentCatalogue';
import { ChevronRight } from 'lucide-react';
import PostingAvailabilityEditor from '@/components/profile/PostingAvailabilityEditor';

export default function PostingSuccessionTab({ employee, successionPlans, onSaved }) {
  const currentLabel = employee?.current_appointment || '';
  const [pathway, setPathway] = useState(null);
  const [loadingPathway, setLoadingPathway] = useState(false);

  // Where personnel who held this appointment moved on to next, read from the imported history.
  useEffect(() => {
    if (!currentLabel) return;
    let cancelled = false;
    setLoadingPathway(true);
    fetchPathways([currentLabel])
      .then(map => { if (!cancelled) setPathway(map[currentLabel] || null); })
      .finally(() => { if (!cancelled) setLoadingPathway(false); });
    return () => { cancelled = true; };
  }, [currentLabel]);

  if (!employee) return null;

  const successionRoles = findPersonInSuccessionPlans(employee.employee_id, successionPlans);
  const nextAppointments = (pathway?.typical_successors || []).slice(0, 8);
  const transitionSample = pathway?.transition_sample_size || 0;

  return (
    <div className="space-y-4">
      {/* Current posting */}
      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Current Posting</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
          <div><SectionLabel>Current Appointment</SectionLabel><div className="mt-0.5 font-mono text-sm text-foreground">{employee.current_appointment || '—'}</div></div>
          <div><SectionLabel>Posting Availability</SectionLabel><div className="mt-0.5 text-sm text-foreground">{employee.posting_availability?.availability || 'Not recorded'}</div></div>
          <div><SectionLabel>Recorded Appointments</SectionLabel><div className="mt-0.5 text-sm"><MonoValue>{employee.appointment_count ?? '—'}</MonoValue></div></div>
          <div><SectionLabel>Earliest Posting Date</SectionLabel><div className="mt-0.5 text-sm"><MonoValue>{employee.posting_availability?.earliest_posting_date || 'Not recorded'}</MonoValue></div></div>
        </div>
        {onSaved && (
          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <PostingAvailabilityEditor employee={employee} onSaved={onSaved} buttonLabel="Key in / rectify posting availability" />
          </div>
        )}
      </div>

      {/* Observed onward moves from the workbook */}
      <div className="rounded-sm border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Observed Next Appointments</h3>
            <AIPill />
          </div>
          {transitionSample > 0 && <span className="text-xs text-muted-foreground">{transitionSample} recorded transition{transitionSample !== 1 ? 's' : ''}</span>}
        </div>
        <div className="divide-y divide-border">
          {!currentLabel && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No current appointment recorded for this individual.</div>
          )}
          {currentLabel && loadingPathway && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading recorded moves…</div>
          )}
          {currentLabel && !loadingPathway && nextAppointments.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No onward moves recorded for this appointment in the imported history.</div>
          )}
          {currentLabel && !loadingPathway && nextAppointments.map((entry, i) => (
            <Link
              key={i}
              to={`/posting-workbench?appt=${encodeURIComponent(entry.label)}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40"
            >
              <div>
                <div className="font-mono text-sm font-medium text-foreground">{entry.label}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.count} of the recorded holders moved on to this appointment{entry.share ? ` (${Math.round(entry.share * 100)}%)` : ''}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
        {currentLabel && !loadingPathway && nextAppointments.length > 0 && (
          <p className="border-t border-border px-4 py-2 text-[0.625rem] text-muted-foreground">
            Observed patterns in the imported population — indicative only, not a prediction of this individual's next appointment.
          </p>
        )}
      </div>

      {/* Succession positions */}
      <div className="rounded-sm border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Succession Positions</h3>
          <p className="text-xs text-muted-foreground">Where this individual appears in succession pipelines</p>
        </div>
        <div className="divide-y divide-border">
          {successionRoles.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">Not identified as a successor for any appointment.</div>}
          {successionRoles.map(({ plan, role }, i) => (
            <Link key={i} to="/succession" className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40">
              <div>
                <div className="text-sm font-medium text-foreground">{plan.appointment_title}</div>
                <div className="text-xs text-muted-foreground">Current holder: {plan.current_holder_name || 'Vacant'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{role}</span>
                <StatusBadge status={plan.succession_depth} />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}