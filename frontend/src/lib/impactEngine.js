// Posting Impact Engine — multi-bound posting chain analysis with cascade/domino logic.
// Computes immediate, upstream and downstream impacts when a person is removed.
// AI assists — HR decides. No automatic modifications to approved posting plans.

import { matchPersonToAppointment, buildShortlist } from './postingEngine';

// ─── Posting Chain Construction ──────────────────────────────

// Build a multi-bound posting chain from posting assignments and succession plans.
// Returns an array of "bounds": [{ bound, appointment, person, role }]
export function buildPostingChain(appointmentId, postingAssignments, successionPlans, employees, appointments = []) {
  const bounds = [];
  const pa = postingAssignments.find(p => p.appointment_id === appointmentId);
  const plan = successionPlans.find(p => p.appointment_id === appointmentId);
  const appointment = appointments.find(a => a.appointment_id === appointmentId);

  // Bound 1: the selected appointment
  if (pa) {
    bounds.push({
      bound: 1,
      appointmentId: pa.appointment_id,
      appointmentTitle: pa.appointment_title,
      personId: pa.primary_candidate_id,
      personName: pa.primary_candidate_name,
      role: 'Primary',
      status: pa.status,
      alternate1Id: pa.alternate1_id,
      alternate1Name: pa.alternate1_name,
      alternate2Id: pa.alternate2_id,
      alternate2Name: pa.alternate2_name,
      startDate: appointment ? appointment.start_date : null
    });
  } else if (plan) {
    bounds.push({
      bound: 1,
      appointmentId: plan.appointment_id,
      appointmentTitle: plan.appointment_title,
      personId: plan.current_holder_id,
      personName: plan.current_holder_name,
      role: 'Current Holder',
      status: 'Established'
    });
  }

  // Find downstream bounds: where does the current person go next?
  // Check if the primary candidate is a successor for another appointment
  let currentPersonId = bounds[0]?.personId;
  let boundNum = 1;
  const visited = new Set([appointmentId]);

  while (currentPersonId && boundNum < 5) {
    // Find succession plans where this person is the primary successor
    const nextPlan = successionPlans.find(p =>
      p.primary_successor_id === currentPersonId &&
      !visited.has(p.appointment_id)
    );
    if (!nextPlan) break;
    visited.add(nextPlan.appointment_id);
    boundNum++;
    bounds.push({
      bound: boundNum,
      appointmentId: nextPlan.appointment_id,
      appointmentTitle: nextPlan.appointment_title,
      personId: nextPlan.current_holder_id,
      personName: nextPlan.current_holder_name,
      role: 'Planned Successor',
      status: 'Planned'
    });
    currentPersonId = nextPlan.current_holder_id;
  }

  return bounds;
}

// Bound 1 for an appointment that has no approved posting assignment or succession plan on file:
// the holder the source workbook records as current (open-ended) for that appointment.
// Returns null when the source records no current holder — nothing is assumed.
export function buildRecordedHolderBound(appointmentId, historyRows, employees = []) {
  const open = (historyRows || []).find(r => r.is_current || r.is_open_ended);
  if (!open) return null;
  const person = employees.find(e => e.employee_id === open.employee_id);
  return {
    bound: 1,
    appointmentId,
    appointmentTitle: appointmentId,
    personId: open.employee_id,
    personName: person?.name || open.employee_name || open.employee_id,
    role: 'Recorded Holder',
    status: 'Recorded — not an approved plan',
    recorded: true,
    startDate: null
  };
}

// ─── Impact Analysis ─────────────────────────────────────────

export function analyzeRemoval(personId, personName, appointmentId, appointmentTitle, chain, employees, appointments, options = {}) {
  const appointment = appointments.find(a => a.appointment_id === appointmentId);

  // 1. IMMEDIATE IMPACT
  const immediateImpact = {
    appointmentTitle,
    appointmentId,
    vacancy: `${appointmentTitle} becomes unfilled`,
    personRemoved: personName
  };

  // 2. UPSTREAM IMPACT
  // Identify development actions, courses, and personnel feeding into this appointment
  const upstream = [];

  // Check if the removed person had development plans targeting this appointment
  const person = employees.find(e => e.employee_id === personId);
  if (person) {
    (person.development || []).forEach(d => {
      if (d.status !== 'Completed') {
        upstream.push({
          type: 'Development Action',
          detail: `${d.gap} — ${d.action} (${d.status})`,
          impact: 'Development action may no longer be required or needs reprioritisation'
        });
      }
    });

    // Check if person was in a development pipeline for this appointment
    if (person.career_aspirations) {
      const prefs = [
        person.career_aspirations.preferred_appointment_1,
        person.career_aspirations.preferred_appointment_2,
        person.career_aspirations.preferred_appointment_3
      ].filter(Boolean);
      if (prefs.some(p => appointmentTitle.toLowerCase().includes(p.toLowerCase().split('(')[0].trim()))) {
        upstream.push({
          type: 'Career Aspiration',
          detail: `${personName} had this as a stated career preference`,
          impact: 'Career aspiration pathway disrupted — HR may need to counsel individual'
        });
      }
    }
  }

  // Check for other people who were being developed for this appointment
  // (succession plan alternates)
  // This would come from succession plans
  upstream.push({
    type: 'Pipeline',
    detail: 'Alternate candidates in the development pipeline may need accelerated readiness',
    impact: 'Development timeline may need compression'
  });

  // 3. DOWNSTREAM IMPACT
  // Identify future appointments that depended on this person progressing
  const downstream = [];
  chain.filter(b => b.personId === personId && b.bound > 1).forEach(b => {
    downstream.push({
      type: 'Posting Bound',
      detail: `${b.appointmentTitle} (Bound ${b.bound}) loses planned incumbent`,
      impact: 'Future posting bound becomes uncovered'
    });
  });

  // Check if this person was a successor for other appointments
  // (would need succession plans data — passed in options)
  const successionPlans = options.successionPlans || [];
  const dependentPlans = successionPlans.filter(p =>
    p.primary_successor_id === personId || p.alternate1_id === personId || p.alternate2_id === personId
  );
  dependentPlans.forEach(p => {
    if (p.appointment_id !== appointmentId) {
      downstream.push({
        type: 'Succession Dependency',
        detail: `${personName} was identified as successor for ${p.appointment_title}`,
        impact: 'Succession pipeline for this appointment is weakened'
      });
    }
  });

  return { immediateImpact, upstream, downstream };
}

// ─── Replacement Candidate Search ───────────────────────────

export function findReplacementCandidates(appointment, employees, options = {}) {
  const allMatches = employees.map(p => ({
    person: p,
    ...matchPersonToAppointment(p, appointment, options)
  }));

  const eligible = allMatches.filter(r => r.status === 'Eligible');
  const reviewRequired = allMatches.filter(r => r.status === 'Review Required');
  const excluded = allMatches.filter(r => r.status === 'Excluded' && r.satisfactionPct >= 40); // near-threshold

  // Primary options: immediately eligible and ready
  const primaryOptions = eligible
    .filter(r => r.readiness === 'Ready')
    .sort((a, b) => b._rank - a._rank);

  // Alternate options: eligible with development, or review required
  const alternateOptions = [
    ...eligible.filter(r => r.readiness === 'Ready with Development'),
    ...reviewRequired
  ].sort((a, b) => b._rank - a._rank);

  // Development options: excluded but near threshold (could become ready)
  const developmentOptions = excluded
    .filter(r => r.satisfactionPct >= 40)
    .sort((a, b) => b.satisfactionPct - a.satisfactionPct);

  return { primaryOptions, alternateOptions, developmentOptions, allMatches };
}

// ─── Cascade / Domino Analysis ──────────────────────────────

export function analyzeCascade(candidateId, candidateName, targetAppointmentId, postingAssignments, successionPlans, employees, appointments, options = {}, depth = 0, visited = new Set()) {
  if (depth > 3) return { stopped: true, reason: 'Maximum cascade depth reached' };
  if (visited.has(candidateId)) return { stopped: true, reason: 'Circular dependency detected' };
  visited.add(candidateId);

  // Check if candidate is already assigned as primary to another appointment
  const conflicts = postingAssignments.filter(pa =>
    pa.primary_candidate_id === candidateId &&
    pa.appointment_id !== targetAppointmentId &&
    pa.status !== 'Replacement Required'
  );

  // Check if candidate is a successor in succession plans
  const planConflicts = successionPlans.filter(p =>
    (p.primary_successor_id === candidateId || p.alternate1_id === candidateId) &&
    p.appointment_id !== targetAppointmentId
  );

  // Moving a person out of the appointment they hold today always leaves that appointment to be
  // filled: the second vacancy arises whether the appointment is ending, has already ended, or
  // carries no end date at all. A recorded APPT END is a planning trigger date, nothing more.
  const candidate = employees.find(e => e.employee_id === candidateId);
  const heldApptId = candidate?.current_appointment;
  const holdsAnotherAppointment = !!heldApptId && heldApptId !== targetAppointmentId;

  const byAppointment = new Map();
  if (holdsAnotherAppointment) {
    byAppointment.set(heldApptId, {
      appointmentId: heldApptId,
      appointmentTitle: appointments.find(a => a.appointment_id === heldApptId)?.title || heldApptId,
      personId: candidateId,
      personName: candidateName,
      type: 'held_appointment',
      apptEnd: candidate?.appt_end || null
    });
  }
  conflicts.forEach(pa => {
    if (!byAppointment.has(pa.appointment_id)) {
      byAppointment.set(pa.appointment_id, {
        appointmentId: pa.appointment_id,
        appointmentTitle: pa.appointment_title,
        personId: candidateId,
        personName: candidateName,
        type: 'posting_assignment',
        apptEnd: candidate?.appt_end || null
      });
    }
  });
  planConflicts.forEach(p => {
    if (!byAppointment.has(p.appointment_id)) {
      byAppointment.set(p.appointment_id, {
        appointmentId: p.appointment_id,
        appointmentTitle: p.appointment_title,
        personId: candidateId,
        personName: candidateName,
        type: 'succession_plan',
        apptEnd: candidate?.appt_end || null
      });
    }
  });

  if (byAppointment.size === 0) {
    return { createsSecondaryVacancy: false, candidateId, candidateName };
  }

  // Secondary vacancies created
  const secondaryVacancies = [...byAppointment.values()];

  // For each secondary vacancy, find replacement candidates
  const cascadeResults = secondaryVacancies.map(vac => {
    const appt = appointments.find(a => a.appointment_id === vac.appointmentId);
    if (!appt) return { ...vac, replacements: [] };

    const replacements = findReplacementCandidates(appt, employees, options);

    return {
      ...vac,
      primaryReplacements: replacements.primaryOptions.slice(0, 3).map(r => ({
        personId: r.person.employee_id,
        personName: r.person.name,
        readiness: r.readiness,
        satisfactionPct: r.satisfactionPct
      })),
      alternateReplacements: replacements.alternateOptions.slice(0, 2).map(r => ({
        personId: r.person.employee_id,
        personName: r.person.name,
        readiness: r.readiness,
        satisfactionPct: r.satisfactionPct
      }))
    };
  });

  return {
    createsSecondaryVacancy: true,
    candidateId,
    candidateName,
    secondaryVacancies: cascadeResults,
    depth
  };
}

// ─── Development-to-Eligibility Analysis ─────────────────────

export function analyzeDevelopmentToEligibility(person, appointment, targetDate, options = {}) {
  const gaps = identifyGapsFromMatch(person, appointment, options);
  const today = new Date();
  const target = new Date(targetDate);
  const monthsToTarget = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

  // Estimate months needed for development
  let monthsNeeded = 0;
  gaps.skillGaps.forEach(g => {
    monthsNeeded += g.gap * 3; // 3 months per proficiency level
  });
  if (gaps.missingMandatoryCourses.length > 0) {
    monthsNeeded += gaps.missingMandatoryCourses.length * 3; // 3 months per course
  }
  if (gaps.missingQuals.length > 0) {
    monthsNeeded += gaps.missingQuals.length * 6; // 6 months per qualification
  }

  const canBeReady = monthsNeeded <= monthsToTarget;
  const earliestReadyDate = new Date(today);
  earliestReadyDate.setMonth(earliestReadyDate.getMonth() + monthsNeeded);

  return {
    person,
    gaps,
    monthsNeeded,
    monthsToTarget,
    canBeReady,
    earliestReadyDate: earliestReadyDate.toISOString().slice(0, 10),
    recommendation: canBeReady
      ? `POTENTIALLY READY BY ${earliestReadyDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
      : 'DEVELOPMENT WINDOW INSUFFICIENT'
  };
}

function identifyGapsFromMatch(person, appointment, options) {
  const match = matchPersonToAppointment(person, appointment, options);
  const skillGaps = (match.skillsGap || []).filter(g => g.gap > 0);
  const missingQuals = (appointment.mandatory_qualifications || []).filter(q =>
    !(person.qualifications || []).some(pq => pq.qualification === q)
  );
  const personCourses = (person.courses || []).map(c => c.course);
  const missingMandatoryCourses = (appointment.required_courses || [])
    .filter(c => {
      const cr = typeof c === 'string' ? { course: c, classification: 'Mandatory Prerequisite' } : c;
      return cr.classification === 'Mandatory Prerequisite' && !personCourses.includes(cr.course);
    });
  return { skillGaps, missingQuals, missingMandatoryCourses, match };
}

// ─── Scenario Comparison ────────────────────────────────────

export function compareScenarios(baseline, scenarios) {
  return scenarios.map((s, i) => {
    const filledCount = s.appointments.filter(a => a.filled).length;
    const unfilledCount = s.appointments.filter(a => !a.filled).length;
    const personnelAffected = new Set(s.changes.map(c => c.personId)).size;
    const postingChanges = s.changes.length;
    const skillGaps = s.changes.reduce((acc, c) => acc + (c.skillGaps || 0), 0);
    const coursesRequired = s.changes.reduce((acc, c) => acc + (c.coursesRequired || 0), 0);
    const devActionsRequired = s.changes.reduce((acc, c) => acc + (c.devActions || 0), 0);
    const newConflicts = s.secondaryVacancies?.length || 0;

    return {
      label: s.label || `Scenario ${String.fromCharCode(65 + i)}`,
      filled: filledCount,
      unfilled: unfilledCount,
      personnelAffected,
      postingChanges,
      skillGaps,
      coursesRequired,
      devActionsRequired,
      newConflicts,
      upstream: s.upstream || [],
      downstream: s.downstream || []
    };
  });
}

// ─── Replacement Chain Projection (full cascade) ───────────
// When a specific candidate is selected as replacement, project the whole cascade:
// which appointment they vacate, who could take it, and the vacancies that move
// triggers further down the line. Runs until the chain ends, the chain loops, or the
// bound limit is reached (a projection limit is reported rather than hidden).
// This is a what-if projection — the approved plan is NOT modified.

export function projectReplacementChain(candidateId, candidateName, targetAppointmentId, postingAssignments, successionPlans, employees, appointments, options = {}, maxDepth = 6) {
  const chain = [];
  let currentCandidateId = candidateId;
  let currentCandidateName = candidateName;
  let currentTargetApptId = targetAppointmentId;
  const visited = new Set([targetAppointmentId]);
  // People already placed in this projection: once someone is chosen for a bound's vacancy they are
  // no longer a candidate for any later vacancy, which leaves only the next in line.
  const moved = new Set([candidateId]);

  for (let depth = 0; depth < maxDepth; depth++) {
    // Check if candidate is assigned as primary to another appointment
    const conflictPA = postingAssignments.find(pa =>
      pa.primary_candidate_id === currentCandidateId &&
      pa.appointment_id !== currentTargetApptId &&
      pa.status !== 'Replacement Required'
    );

    // Check if candidate is a successor in a succession plan for another appointment
    const conflictPlan = successionPlans.find(p =>
      (p.primary_successor_id === currentCandidateId || p.alternate1_id === currentCandidateId) &&
      p.appointment_id !== currentTargetApptId
    );

    // The appointment the candidate currently holds on record: moving them leaves it to be filled,
    // so it is a next-bound effect even when no plan or assignment names them elsewhere.
    const candidate = employees.find(e => e.employee_id === currentCandidateId);
    const heldApptId = candidate?.current_appointment;
    const holdsAnotherAppointment = !!heldApptId && heldApptId !== currentTargetApptId;

    if (!conflictPA && !conflictPlan && !holdsAnotherAppointment) {
      chain.push({
        depth,
        selectedCandidateId: currentCandidateId,
        selectedCandidateName: currentCandidateName,
        vacatedAppointment: null,
        replacementOptions: [],
        chainEnds: true,
        endReason: 'No further effect — candidate holds no other recorded appointment and is not named on another plan'
      });
      break;
    }

    const vacatedApptId = (conflictPA || conflictPlan)?.appointment_id || heldApptId;
    const vacatedFrom = conflictPA
      ? 'Already planned as primary for this appointment'
      : conflictPlan
        ? 'Already named successor for this appointment'
        : 'Currently holds this appointment';
    const vacatedApptTitle = (conflictPA || conflictPlan)?.appointment_title || appointments.find(a => a.appointment_id === vacatedApptId)?.title || vacatedApptId;

    if (visited.has(vacatedApptId)) {
      chain.push({
        depth,
        selectedCandidateId: currentCandidateId,
        selectedCandidateName: currentCandidateName,
        vacatedAppointment: { id: vacatedApptId, title: vacatedApptTitle },
        circularDetected: true,
        chainEnds: true,
        endReason: 'Circular dependency detected — chain stopped'
      });
      break;
    }
    visited.add(vacatedApptId);

    // Find replacement options for the vacated appointment
    const appt = appointments.find(a => a.appointment_id === vacatedApptId);
    let replacementOptions = [];
    if (appt) {
      const replacements = findReplacementCandidates(appt, employees, options);
      const stillAvailable = r => !moved.has(r.person.employee_id);
      replacementOptions = [
        ...replacements.primaryOptions.filter(stillAvailable).slice(0, 3).map(r => ({
          personId: r.person.employee_id,
          personName: r.person.name,
          readiness: r.readiness,
          satisfactionPct: r.satisfactionPct,
          type: 'primary'
        })),
        ...replacements.alternateOptions.filter(stillAvailable).slice(0, 2).map(r => ({
          personId: r.person.employee_id,
          personName: r.person.name,
          readiness: r.readiness,
          satisfactionPct: r.satisfactionPct,
          type: 'alternate'
        }))
      ];
    }

    chain.push({
      depth,
      selectedCandidateId: currentCandidateId,
      selectedCandidateName: currentCandidateName,
      vacatedAppointment: { id: vacatedApptId, title: vacatedApptTitle, source: vacatedFrom, poisedOn: candidate?.appt_end || null },
      replacementOptions,
      chainEnds: false
    });

    // Move to the next bound: the top replacement option becomes the next candidate
    if (replacementOptions.length > 0) {
      currentCandidateId = replacementOptions[0].personId;
      currentCandidateName = replacementOptions[0].personName;
      currentTargetApptId = vacatedApptId;
      moved.add(currentCandidateId);
    } else {
      chain.push({
        depth: depth + 1,
        selectedCandidateId: null,
        selectedCandidateName: null,
        vacatedAppointment: null,
        noReplacement: true,
        chainEnds: true,
        endReason: 'No replacement candidates found for this vacancy'
      });
      break;
    }
  }

  // The bound limit was reached while the chain was still unfolding: say so rather than
  // presenting a partial cascade as the whole effect.
  const last = chain[chain.length - 1];
  if (last && !last.chainEnds && last.depth === maxDepth - 1 && last.replacementOptions?.length > 0) {
    chain.push({
      depth: maxDepth,
      selectedCandidateId: null,
      selectedCandidateName: null,
      vacatedAppointment: null,
      truncated: true,
      chainEnds: true,
      endReason: `Showing the first ${maxDepth} bounds — the chain continues beyond this projection`
    });
  }

  return chain;
}