import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { Section, BasicInfo, CareerHistory, Skills, Qualifications, Aspirations, Development, AuditTimeline, Courses, PostingInfo, HRTags } from '@/components/profile/ProfileSections';
import Attributes from '@/components/profile/Attributes';
import SupervisorAssessmentTimeline from '@/components/profile/SupervisorAssessmentTimeline';
import PostingSuccessionTab from '@/components/profile/PostingSuccessionTab';
import EhrDataTab from '@/components/profile/EhrDataTab';
import RankOverAgeChart from '@/components/profile/RankOverAgeChart';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { TAB_LABELS } from '@/lib/reviewTabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReadyPill, ReviewPill, AIPill, MonoValue, SectionLabel } from '@/components/badges';
import GroomingTag from '@/components/grooming/GroomingTag';

export default function PersonDetail() {
  const { employeeId } = useParams();
  const { successionPlans, skills, courses, appointments, loading: dataLoading } = useWorkbenchData();
  const [employee, setEmployee] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  // A review indicator elsewhere in the app opens this profile at the tab that holds the item, e.g. ?tab=skills
  // and names the item in ?focus= so HR is told what the review is for, not only where to look.
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'overview');
  const [focus, setFocus] = useState(new URLSearchParams(window.location.search).get('focus') || '');

  // A recorded review updates the profile straight away and is written to the audit trail.
  const handleSaved = (updated) => {
    setEmployee(updated);
    base44.entities.AuditRecord.list('-timestamp', 100)
      .then(rows => setAudit(rows.filter(r => r.individual === updated?.name)));
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      base44.entities.Employee.filter({ employee_id: employeeId }),
      base44.entities.SupervisorAssessment.filter({ employee_id: employeeId }),
      base44.entities.AuditRecord.list('-timestamp', 100),
      base44.entities.AppointmentHistory.filter({ employee_id: employeeId }, { sort: 'sequence', limit: 200 })
    ]).then(([emps, asses, aud, hist]) => {
      if (!mounted) return;
      setEmployee(emps[0] || null);
      setAssessments(asses || []);
      setAudit(aud.filter(r => r.individual === (emps[0]?.name)));
      setHistory(hist.items || []);
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [employeeId]);

  // A review link names the item; the section holding it is ringed and scrolled into view.
  const focusSection = !focus ? null
    : tab === 'skills' ? 'Skills'
      : tab === 'development' ? 'Development Actions'
        : tab === 'aspirations' ? 'Career Aspirations'
          : tab === 'assessments' ? 'Supervisor Assessments'
            : tab === 'history' ? 'Career History'
              : tab === 'succession' ? 'Posting & Succession'
                : /availab|posting|tour|appt end/i.test(focus) ? 'Posting Information' : 'Basic Information';

  useEffect(() => {
    if (!focus || loading) return;
    const el = document.querySelector('[data-review-focus="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus, tab, loading]);

  // Migrated appointment history is held as its own records — mapped to the profile display shape.
  const careerHistory = history.map(h => ({
    appointment: h.appointment,
    start_date: h.start_date,
    end_date: h.end_date,
    duration: h.is_open_ended ? 'Current / Ongoing — Subject to Validation' : (h.duration_label || ''),
    appointment_type: h.is_current ? 'Current' : 'Historical'
  }));

  if (loading || dataLoading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  if (!employee) return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <p className="text-sm text-muted-foreground">Individual not found in the authorised population.</p>
      <Link to="/people" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to People</Link>
    </div>
  );

  const latestAssessment = assessments.length > 0
    ? [...assessments].sort((a, b) => (a.assessment_period || '').localeCompare(b.assessment_period || '')).slice(-1)[0]
    : null;

  // A talent + wrangler belongs in a P1/P2 grooming appointment — their standing is shown on the profile.
  const groomingTier = (appointments || []).find(a => a.appointment_id === employee.current_appointment)?.grooming_tier || '';

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <Link to="/people" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> People
      </Link>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{employee.name}</h1>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{employee.employee_id} · {employee.rank} · {employee.vocation} · {employee.current_appointment}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <GroomingTag employee={employee} tier={groomingTier} />
          </div>
        </div>
        {latestAssessment && (
          <div className="text-right">
            <SectionLabel>Latest Assessment ({latestAssessment.assessment_period})</SectionLabel>
            <p className="mt-0.5 text-sm text-foreground">{latestAssessment.overall_assessment || '—'}</p>
          </div>
        )}
      </div>

      {focus && (
        <div className="mb-4 rounded-sm border border-review bg-amber-50/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-review">
                <AlertTriangle className="h-3.5 w-3.5" /> What this review is for
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{focus}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Held in <span className="font-medium text-foreground">{TAB_LABELS[tab] || tab}</span>
                {focusSection ? ' — the ringed section below' : ''}. Record it there and the review indicator clears.
              </p>
            </div>
            <button onClick={() => setFocus('')} className="shrink-0 rounded-sm border border-border bg-card px-2 py-1 text-[0.625rem] font-medium text-muted-foreground hover:bg-secondary">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1 rounded-sm border border-border bg-card p-1">
          <TabsTrigger value="overview" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="history" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Career History</TabsTrigger>
          <TabsTrigger value="skills" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Skills & Attributes</TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Assessments</TabsTrigger>
          <TabsTrigger value="aspirations" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Aspirations</TabsTrigger>
          <TabsTrigger value="development" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Development</TabsTrigger>
          <TabsTrigger value="succession" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Posting & Succession</TabsTrigger>
          <TabsTrigger value="ehr" className="rounded-sm px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">eHR Data</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <Section title="Basic Information" subtitle="Identity and current appointment context" highlight={focusSection === 'Basic Information'}>
            <BasicInfo e={employee} />
          </Section>
          <Section title="Posting Information" subtitle="Availability window, restrictions and posting status" highlight={focusSection === 'Posting Information'}>
            <PostingInfo e={employee} onSaved={handleSaved} />
          </Section>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Top Skills" subtitle="Strongest validated capabilities">
              <Skills items={(employee.skills || []).slice(0, 5)} />
            </Section>
            <Section title="Latest Assessment Summary" subtitle={`${latestAssessment?.assessment_period || '—'} · ${latestAssessment?.supervisor_name || '—'}`}>
              {latestAssessment ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground">{latestAssessment.overall_assessment || '—'}</p>
                  {latestAssessment.key_strengths?.length > 0 && (
                    <div><SectionLabel>Key Strengths</SectionLabel>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {latestAssessment.key_strengths.map((s, i) => <span key={i} className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-ready">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {latestAssessment.development_areas?.length > 0 && (
                    <div><SectionLabel>Development Areas</SectionLabel>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {latestAssessment.development_areas.map((d, i) => <span key={i} className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-review">{d}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">No supervisor assessments recorded.</p>}
            </Section>
          </div>
        </TabsContent>

        {/* CAREER HISTORY */}
        <TabsContent value="history" className="mt-0 space-y-4">
          <Section title="Career History" subtitle="Previous appointments, experience tags and duration" highlight={focusSection === 'Career History'}>
            <CareerHistory items={careerHistory} />
          </Section>
          <Section title="Route of Advancement (ROA)" subtitle="Professional progression timeline mapping career milestones and rank transitions across the service tenure" action={<AIPill />}>
            <RankOverAgeChart employee={{ ...employee, career_history: careerHistory }} />
          </Section>
        </TabsContent>

        {/* SKILLS & ATTRIBUTES */}
        <TabsContent value="skills" className="mt-0 space-y-4">
          <Section title="Skills" subtitle="Current capability with supporting evidence and validation" highlight={focusSection === 'Skills'}>
            <Skills items={employee.skills} employee={employee} onSaved={handleSaved} />
          </Section>
          <Section title="Qualifications" subtitle="Recorded qualifications with their verification status">
            <Qualifications items={employee.qualifications} employee={employee} onSaved={handleSaved} />
          </Section>
          <Section title="Attributes" subtitle="Observed behavioural qualities — distinct from skills, not mandatory posting criteria">
            <Attributes items={employee.attributes} />
          </Section>
        </TabsContent>

        {/* ASSESSMENTS */}
        <TabsContent value="assessments" className="mt-0">
          <Section title="Supervisor Assessments" subtitle="Longitudinal assessment timeline — historical assessments are never overwritten" action={<AIPill />} highlight={focusSection === 'Supervisor Assessments'}>
            <SupervisorAssessmentTimeline assessments={assessments} />
          </Section>
        </TabsContent>

        {/* ASPIRATIONS */}
        <TabsContent value="aspirations" className="mt-0">
          <Section title="Career Aspirations" subtitle="Employee voice — preference is one input, not entitlement" highlight={focusSection === 'Career Aspirations'}>
            <Aspirations data={employee.career_aspirations} employee={employee} onSaved={handleSaved} />
          </Section>
        </TabsContent>

        {/* DEVELOPMENT */}
        <TabsContent value="development" className="mt-0 space-y-4">
          <Section title="Development Actions" subtitle="Agreed development actions and gaps" highlight={focusSection === 'Development Actions'}>
            <Development items={employee.development} employee={employee} onSaved={handleSaved} />
          </Section>
          <Section title="Courses" subtitle="Completed courses — completion is evidence of development, NOT automatic proficiency">
            <Courses items={employee.courses} />
          </Section>
        </TabsContent>

        {/* POSTING & SUCCESSION */}
        <TabsContent value="succession" className="mt-0">
          <div
            data-review-focus={focusSection === 'Posting & Succession' ? 'true' : undefined}
            className={`rounded-sm ${focusSection === 'Posting & Succession' ? 'border border-review p-1 ring-2 ring-review/40' : ''}`}
          >
            <PostingSuccessionTab
              employee={employee}
              successionPlans={successionPlans}
              onSaved={handleSaved}
            />
          </div>
        </TabsContent>

        {/* eHR DATA */}
        <TabsContent value="ehr" className="mt-0">
          <EhrDataTab employee={employee} />
        </TabsContent>
      </Tabs>

      {/* Audit trail (always visible at bottom) */}
      <div className="mt-6">
        <Section title="Audit Trail" subtitle="Historical changes relevant to this individual">
          <AuditTimeline items={audit} />
        </Section>
      </div>
    </div>
  );
}