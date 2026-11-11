import React, { useMemo, useState } from 'react';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { computeCareerPathway } from '@/lib/pathwayEngine';
import { AIPill, MonoValue, ReadyPill, ReviewPill, StatusBadge, SectionLabel } from '@/components/badges';
import { formatVocations } from '@/lib/postingEngine';
import WorkbookAppointmentPicker from '@/components/posting/WorkbookAppointmentPicker';
import { ChevronRight, ChevronDown, AlertTriangle, Check, Clock, GraduationCap, Target, ArrowRight, Route } from 'lucide-react';

const STATUS_STYLES = {
  'ON TRACK': 'border-ready bg-emerald-50 text-ready',
  'AT RISK': 'border-review bg-amber-50 text-review',
  'DEVELOPMENT GAP': 'border-review bg-amber-50 text-review',
  'COURSE DEPENDENCY': 'border-destructive bg-red-50 text-destructive',
  'EXPERIENCE GAP': 'border-review bg-amber-50 text-review',
  'TIMELINE CONFLICT': 'border-destructive bg-red-50 text-destructive'
};

const COURSE_STATUS_STYLES = {
  'Completed': 'bg-emerald-50 text-ready',
  'Planned': 'bg-primary/10 text-primary',
  'Required': 'bg-red-50 text-destructive',
  'At Risk': 'bg-amber-50 text-review',
  'Not Planned': 'bg-secondary text-muted-foreground'
};

function StageCard({ stage, isLast, options }) {
  const [expanded, setExpanded] = useState(false);
  const appt = stage.appointment;
  const isCurrent = stage.type === 'current';
  const isTarget = stage.type === 'target';
  const isIntermediate = stage.type === 'intermediate';

  const borderCls = isCurrent ? 'border-primary' : isTarget ? 'border-ready' : 'border-border';

  return (
    <div className="flex items-start">
      <div className="flex-1">
        <div className={`rounded-sm border border-border border-l-4 ${borderCls} bg-card p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCurrent && <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase text-primary-foreground">Current</span>}
              {isIntermediate && <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase text-foreground">Intermediate {stage.stageNumber}</span>}
              {isTarget && <Target className="h-4 w-4 text-ready" />}
              <span className="text-sm font-semibold text-foreground">{appt.title}</span>
            </div>
            {stage.readiness && (
              stage.readiness === 'Ready' ? <ReadyPill>{stage.readiness}</ReadyPill> : <ReviewPill>{stage.readiness}</ReviewPill>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {appt.rank_requirement && <span>Rank: {appt.rank_requirement}</span>}
            {appt.vocation_requirement && <span className="ml-2">· Vocations: {formatVocations(appt.vocation_requirement)}</span>}
            {appt.organisation && <span className="ml-2">· {appt.organisation}</span>}
          </div>

          {isIntermediate && stage.reason && (
            <div className="mt-2 rounded-sm bg-ai-soft p-2">
              <div className="flex items-center gap-1.5">
                <AIPill />
                <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-ai">Why this appointment?</span>
              </div>
              <p className="mt-1 text-xs text-foreground">{stage.reason}</p>
            </div>
          )}

          {isTarget && stage.targetDate && (
            <div className="mt-1 text-xs"><SectionLabel>Target Date</SectionLabel> <MonoValue>{stage.targetDate}</MonoValue></div>
          )}

          {/* Expandable details */}
          <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-[0.6875rem] font-medium text-primary hover:underline">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? 'Hide requirements' : 'Show requirements & gaps'}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 border-t border-border pt-2">
              {(appt.required_skills || []).length > 0 && (
                <div>
                  <SectionLabel>Required Skills</SectionLabel>
                  <div className="mt-1 space-y-0.5">
                    {(appt.required_skills || []).map((rs, i) => (
                      <div key={i} className="text-xs text-foreground">
                        {rs.skill} — desired L{rs.desired_proficiency || rs.proficiency}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(appt.mandatory_qualifications || []).length > 0 && (
                <div>
                  <SectionLabel>Mandatory Qualifications</SectionLabel>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(appt.mandatory_qualifications || []).map((q, i) => (
                      <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{q}</span>
                    ))}
                  </div>
                </div>
              )}
              {(appt.required_courses || []).length > 0 && (
                <div>
                  <SectionLabel>Required Courses</SectionLabel>
                  <div className="mt-1 space-y-0.5">
                    {(appt.required_courses || []).map((c, i) => {
                      const cr = typeof c === 'string' ? { course: c, classification: 'Mandatory Prerequisite' } : c;
                      return (
                        <div key={i} className="text-xs text-foreground">
                          {cr.course} <span className="text-muted-foreground">({cr.classification})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {appt.required_experience && (
                <div><SectionLabel>Required Experience</SectionLabel><p className="mt-0.5 text-xs text-foreground">{appt.required_experience}</p></div>
              )}
            </div>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center px-1 pt-4">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function CoursePlanCard({ course }) {
  return (
    <div className="rounded-sm border border-border bg-secondary/30 p-2.5">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{course.course}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${COURSE_STATUS_STYLES[course.status] || COURSE_STATUS_STYLES['Required']}`}>
          {course.status}
        </span>
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground">{course.classification}</span>
      </div>
      <div className="mt-1.5 space-y-0.5 text-[0.6875rem] text-muted-foreground">
        {course.skillAddressed && <div>Skill/Qual: {course.skillAddressed}</div>}
        {course.recommendedWindow && <div>Recommended by: <MonoValue>{course.recommendedWindow}</MonoValue></div>}
        {course.latestCompletion && (
          <div className="font-medium text-destructive">REQUIRED BEFORE <MonoValue>{course.latestCompletion}</MonoValue></div>
        )}
      </div>
    </div>
  );
}

export default function CareerPathwayView({ onAssessImpact, presetPersonId, presetApptId }) {
  const { employees, appointments, skills, courses, loading } = useWorkbenchData();
  const [personId, setPersonId] = useState(presetPersonId || '');
  const [targetApptId, setTargetApptId] = useState(presetApptId || '');
  const [targetDate, setTargetDate] = useState('');

  React.useEffect(() => {
    if (presetPersonId) setPersonId(presetPersonId);
    if (presetApptId) setTargetApptId(presetApptId);
  }, [presetPersonId, presetApptId]);

  const person = employees.find(e => e.employee_id === personId);
  const targetAppt = appointments.find(a => a.appointment_id === targetApptId);

  const pathway = useMemo(() => {
    if (!person || !targetAppt || !targetDate) return null;
    return computeCareerPathway(person, targetAppt, targetDate, appointments, { skillsLibrary: skills, courses });
  }, [person, targetAppt, targetDate, appointments, skills, courses]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Career Pathway Builder</h3>
          <AIPill />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Select an individual and target appointment to compute the development pathway. The system identifies gaps and recommends intermediate steps — HR confirms all decisions.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)} className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground">
              <option value="">Select…</option>
              {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name} — {e.rank} {e.vocation} ({e.employee_id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Target Appointment (workbook)</label>
            <div className="mt-1">
              <WorkbookAppointmentPicker value={targetApptId} onChange={setTargetApptId} buttonClassName="w-full" />
            </div>
          </div>
          <div>
            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Target Date / Posting Bound</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground" />
          </div>
        </div>
      </div>

      {!pathway && (
        <div className="rounded-sm border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Select an individual, target appointment and target date to compute the career pathway.
        </div>
      )}

      {pathway && (
        <>
          {/* Pathway Status */}
          <div className="rounded-sm border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-sm border px-2 py-1 text-xs font-semibold ${STATUS_STYLES[pathway.status.primaryStatus] || STATUS_STYLES['AT RISK']}`}>
                  {pathway.status.primaryStatus}
                </span>
                {pathway.status.allStatuses.filter(s => s !== pathway.status.primaryStatus).map(s => (
                  <span key={s} className={`rounded-sm border px-1.5 py-0.5 text-[0.625rem] font-semibold ${STATUS_STYLES[s] || STATUS_STYLES['AT RISK']}`}>{s}</span>
                ))}
              </div>
              <div className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{pathway.status.monthsToTarget} months to target</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div><SectionLabel>Current Readiness</SectionLabel><p className="mt-0.5 text-sm text-foreground">{pathway.status.currentReadiness}</p></div>
              <div><SectionLabel>Target Readiness</SectionLabel><p className="mt-0.5 text-sm text-foreground">{pathway.status.targetReadiness}</p></div>
              <div><SectionLabel>Critical Gaps</SectionLabel>
                <p className="mt-0.5 text-sm text-foreground">
                  {pathway.status.criticalGaps.length > 0 ? pathway.status.criticalGaps.join('; ') : 'None identified'}
                </p>
              </div>
              <div><SectionLabel>Next Required Action</SectionLabel><p className="mt-0.5 text-sm text-foreground">{pathway.status.nextAction}</p></div>
            </div>
          </div>

          {/* Horizontal Pathway */}
          <div className="rounded-sm border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Career Pathway</h3>
            <div className="flex items-stretch gap-0 overflow-x-auto">
              {pathway.stages.map((stage, i) => (
                <div key={i} className="flex items-stretch" style={{ minWidth: '240px' }}>
                  <StageCard stage={stage} isLast={i === pathway.stages.length - 1} options={{ skillsLibrary: skills, courses }} />
                </div>
              ))}
            </div>
          </div>

          {/* Course Plan */}
          {pathway.coursePlan.length > 0 && (
            <div className="rounded-sm border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Course Plan — Backward Scheduled from Target</h3>
                <AIPill />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Mandatory prerequisites must be completed before the target appointment start date. Timing is calculated backwards.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pathway.coursePlan.map((c, i) => (
                  <CoursePlanCard key={i} course={c} />
                ))}
              </div>
            </div>
          )}

          {/* Gap Summary */}
          <div className="rounded-sm border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Gap Analysis</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <SectionLabel>Skill Gaps ({pathway.gaps.skillGaps.length})</SectionLabel>
                {pathway.gaps.skillGaps.length === 0 ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ready"><Check className="h-4 w-4" /> All desired skills met</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {pathway.gaps.skillGaps.map((g, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{g.skill}</span>
                        <span className="text-muted-foreground">L{g.individual} → L{g.desired} (gap: {g.gap})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <SectionLabel>Missing Qualifications ({pathway.gaps.missingQuals.length})</SectionLabel>
                {pathway.gaps.missingQuals.length === 0 ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ready"><Check className="h-4 w-4" /> All mandatory qualifications held</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pathway.gaps.missingQuals.map((q, i) => (
                      <span key={i} className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-review">{q}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link to Posting Impact */}
          <div className="flex justify-end">
            <button onClick={() => onAssessImpact?.(personId, targetApptId)} className="inline-flex items-center gap-1.5 rounded-sm border border-primary bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
              <AlertTriangle className="h-3.5 w-3.5" /> Assess Posting Impact
            </button>
          </div>
        </>
      )}
    </div>
  );
}