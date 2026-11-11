import { tabForText } from '@/lib/reviewTabs';

// Posting workbench derived views — dashboard metrics, action queue, conflict detection.
// AI flags are prompts for HR review, not automated decisions.

// Build the posting action queue from open postings and people.
// A posting is a workbook appointment HR has opened a PostingAssignment against.
export function buildPostingActionQueue(postingAssignments, employees) {
  const empById = Object.fromEntries((employees || []).map(e => [e.employee_id, e]));
  const rows = [];

  (postingAssignments || []).forEach(pa => {
    const label = pa.appointment_title || pa.appointment_id;

    // Posting opened but no candidate identified yet
    if (!pa.primary_candidate_id && pa.status !== 'Confirmed' && pa.status !== 'Replacement Required') {
      rows.push({
        id: `no-candidate-${pa.id}`,
        priority: 'Medium',
        individual: label,
        individualId: null,
        issue: 'Posting opened with no candidate',
        detail: 'Workbook appointment awaits a candidate',
        module: 'Posting',
        status: 'Action Required',
        appointmentId: pa.appointment_id
      });
    }

    // Primary candidate unavailable / replacement required
    if (pa.status === 'Replacement Required') {
      rows.push({
        id: `replacement-${pa.id}`,
        priority: 'High',
        individual: pa.primary_candidate_name || label,
        individualId: pa.primary_candidate_id,
        issue: 'Primary candidate unavailable — replacement required',
        detail: pa.selection_rationale || 'Candidate marked unavailable',
        module: 'Posting',
        status: 'Replacement Required',
        appointmentId: pa.appointment_id
      });
    }
  });

  // Double assignment detection — same person as primary on multiple appointments
  const primaryMap = {};
  (postingAssignments || []).forEach(pa => {
    if (pa.primary_candidate_id && pa.status !== 'Unfilled') {
      if (!primaryMap[pa.primary_candidate_id]) primaryMap[pa.primary_candidate_id] = [];
      primaryMap[pa.primary_candidate_id].push(pa);
    }
  });
  Object.entries(primaryMap).forEach(([cid, pas]) => {
    if (pas.length > 1) {
      const emp = empById[cid];
      rows.push({
        id: `double-${cid}`,
        priority: 'High',
        individual: emp?.name || pas[0].primary_candidate_name,
        individualId: cid,
        issue: 'Candidate assigned to multiple appointments',
        detail: pas.map(p => p.appointment_title).join(' + '),
        module: 'Conflict',
        status: 'Action Required'
      });
    }
  });

  // Missing data — employees without posting availability
  (employees || []).forEach(e => {
    if (!e.posting_availability || !e.posting_availability.earliest_posting_date) {
      rows.push({
        id: `missing-avail-${e.employee_id}`,
        priority: 'Medium',
        individual: e.name,
        individualId: e.employee_id,
        issue: 'Posting availability not recorded',
        detail: 'Earliest posting date missing — HR review required',
        module: 'Data',
        status: 'Review Required'
      });
    }
    (e.qualifications || []).forEach(q => {
      if (q.verification_status && q.verification_status !== 'Verified') {
        rows.push({
          id: `unverified-qual-${e.employee_id}-${q.qualification}`,
          priority: 'Low',
          individual: e.name,
          individualId: e.employee_id,
          issue: 'Qualification requires verification',
          detail: `${q.qualification} — ${q.verification_status}`,
          module: 'Data',
          status: 'Review Required'
        });
      }
    });
  });

  // Development gaps requiring action
  (employees || []).forEach(e => {
    (e.development || []).forEach(d => {
      if (d.status === 'Planned' || d.status === 'Nominated') {
        rows.push({
          id: `dev-${e.employee_id}-${d.gap}`,
          priority: 'Medium',
          individual: e.name,
          individualId: e.employee_id,
          issue: 'Development action required',
          detail: `${d.gap} — ${d.action} (due ${d.due_date || '—'})`,
          module: 'Development',
          status: 'Action Required'
        });
      }
    });
  });

  const order = { High: 0, Medium: 1, Low: 2 };
  rows.sort((a, b) => order[a.priority] - order[b.priority]);
  return rows;
}

// Map an action queue item to the route where HR can rectify it directly.
export function getReviewPath(r) {
  if (!r) return '/posting-workbench';
  if (r.module === 'Posting' && r.appointmentId) return `/posting-workbench?appt=${r.appointmentId}`;
  if (r.module === 'Conflict') return '/succession';
  // Data reviews open the profile at the tab that holds the item being reviewed.
  if (r.module === 'Data' && r.individualId) return `/people/${r.individualId}?tab=${tabForText(r.issue)}`;
  if (r.module === 'Development') return '/development';
  if (r.individualId) return `/people/${r.individualId}`;
  return '/posting-workbench';
}

// Dashboard metrics for the Home posting dashboard.
// Appointment counts describe the workbook; posting counts describe HR's open postings.
export function postingDashboard(appointments, postingAssignments, employees) {
  const appts = appointments || [];
  const postings = postingAssignments || [];

  const workbookAppointments = appts.length;
  const withoutCandidate = postings.filter(pa => !pa.primary_candidate_id && pa.status !== 'Confirmed').length;
  const candidatesIdentified = postings.filter(pa => pa.primary_candidate_id && pa.status !== 'Confirmed').length;
  const pendingConfirmation = postings.filter(pa => pa.status === 'Primary Identified').length;
  const confirmedPostings = postings.filter(pa => pa.status === 'Confirmed').length;
  const replacementRequired = postings.filter(pa => pa.status === 'Replacement Required').length;

  const becomingAvailable = (employees || []).filter(e =>
    e.posting_availability && e.posting_availability.availability === 'Available Soon'
  ).length;

  const devGapsRequiringAction = (employees || []).reduce((sum, e) =>
    sum + (e.development || []).filter(d => d.status === 'Planned' || d.status === 'Nominated').length, 0
  );

  return {
    workbookAppointments, withoutCandidate, candidatesIdentified, pendingConfirmation,
    confirmedPostings, replacementRequired, becomingAvailable, devGapsRequiringAction
  };
}