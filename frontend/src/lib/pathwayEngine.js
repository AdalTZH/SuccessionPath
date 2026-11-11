// Career Pathway Engine — computes the development pathway from current appointment to target.
// Determines gaps, intermediate appointments, course scheduling and pathway status.
// AI assists — HR decides. No automatic confirmation.

import { matchPersonToAppointment, normalizeVocationReq } from './postingEngine';

// ─── Gap Analysis ───────────────────────────────────────────

export function identifyGaps(person, targetAppointment, options = {}) {
  const match = matchPersonToAppointment(person, targetAppointment, options);

  const skillGaps = (match.skillsGap || []).filter(g => g.gap > 0);
  const missingQuals = (targetAppointment.mandatory_qualifications || []).filter(q =>
    !(person.qualifications || []).some(pq => pq.qualification === q)
  );
  const personCourses = (person.courses || []).map(c => c.course);
  const missingMandatoryCourses = (targetAppointment.required_courses || [])
    .filter(c => {
      const cr = typeof c === 'string' ? { course: c, classification: 'Mandatory Prerequisite' } : c;
      return cr.classification === 'Mandatory Prerequisite' && !personCourses.includes(cr.course);
    });
  const missingReadinessCourses = (targetAppointment.required_courses || [])
    .filter(c => {
      const cr = typeof c === 'string' ? { course: c, classification: 'Readiness-enhancing' } : c;
      return cr.classification === 'Readiness-enhancing' && !personCourses.includes(cr.course);
    });
  const missingDevCourses = (targetAppointment.required_courses || [])
    .filter(c => {
      const cr = typeof c === 'string' ? { course: c, classification: 'Developmental' } : c;
      return cr.classification === 'Developmental' && !personCourses.includes(cr.course);
    });

  return {
    match,
    skillGaps,
    missingQuals,
    missingMandatoryCourses,
    missingReadinessCourses,
    missingDevCourses,
    satisfactionPct: match.satisfactionPct,
    readiness: match.readiness,
    hasGaps: skillGaps.length > 0 || missingQuals.length > 0 || missingMandatoryCourses.length > 0
  };
}

// ─── Intermediate Appointment Suggestion ─────────────────────

export function suggestIntermediateAppointments(person, targetAppointment, gaps, allAppointments, options = {}) {
  const suggestions = [];
  const personSkills = (person.skills || []).map(s => s.skill);
  const personTags = person.hr_tags || [];

  // For each skill gap, find appointments that develop that skill
  gaps.skillGaps.forEach(sg => {
    const candidates = allAppointments.filter(a =>
      a.appointment_id !== targetAppointment.appointment_id &&
      a.rank_requirement === person.rank &&
      (a.required_skills || []).some(rs => rs.skill === sg.skill)
    );
    candidates.forEach(a => {
      // Check not already suggested
      if (suggestions.find(s => s.appointment.appointment_id === a.appointment_id)) return;
      const relatedGaps = gaps.skillGaps.filter(g =>
        (a.required_skills || []).some(rs => rs.skill === g.skill)
      );
      suggestions.push({
        appointment: a,
        reason: `Provides ${relatedGaps.map(g => g.skill).join(', ')} experience required for ${targetAppointment.title}`,
        addressedGaps: relatedGaps.map(g => g.skill),
        gapType: 'skill'
      });
    });
  });

  // For qualification gaps, find appointments that typically require or develop that qualification
  gaps.missingQuals.forEach(q => {
    const candidates = allAppointments.filter(a =>
      a.appointment_id !== targetAppointment.appointment_id &&
      a.rank_requirement === person.rank &&
      (a.mandatory_qualifications || []).includes(q)
    );
    candidates.forEach(a => {
      if (suggestions.find(s => s.appointment.appointment_id === a.appointment_id)) return;
      suggestions.push({
        appointment: a,
        reason: `Provides pathway to obtain ${q} qualification required for ${targetAppointment.title}`,
        addressedGaps: [q],
        gapType: 'qualification'
      });
    });
  });

  // For experience gaps (required_tags / required_experience), find appointments with matching tags
  const reqTags = targetAppointment.required_tags || [];
  const missingTags = reqTags.filter(t => !personTags.includes(t));
  missingTags.forEach(tag => {
    const candidates = allAppointments.filter(a =>
      a.appointment_id !== targetAppointment.appointment_id &&
      a.rank_requirement === person.rank &&
      (a.required_tags || []).includes(tag)
    );
    candidates.slice(0, 1).forEach(a => {
      if (suggestions.find(s => s.appointment.appointment_id === a.appointment_id)) return;
      suggestions.push({
        appointment: a,
        reason: `Provides ${tag} experience (required tag for ${targetAppointment.title})`,
        addressedGaps: [tag],
        gapType: 'experience'
      });
    });
  });

  return suggestions.slice(0, 3); // Limit to 3 intermediate suggestions
}

// ─── Course Planning (backward scheduling from target date) ──

export function planCourses(gaps, targetDate, coursesLibrary = []) {
  const target = new Date(targetDate);
  if (isNaN(target)) return [];

  const allMissingCourses = [
    ...gaps.missingMandatoryCourses.map(c => ({ ...c, priority: 'Mandatory Prerequisite' })),
    ...gaps.missingReadinessCourses.map(c => ({ ...c, priority: 'Readiness-enhancing' })),
    ...gaps.missingDevCourses.map(c => ({ ...c, priority: 'Developmental' }))
  ];

  return allMissingCourses.map(mc => {
    const courseName = typeof mc === 'string' ? mc : (mc.course || mc.course_name);
    const classification = typeof mc === 'string' ? 'Mandatory Prerequisite' : (mc.classification || mc.priority);
    const courseInfo = coursesLibrary.find(c => c.course_name === courseName);

    // Backward scheduling: mandatory must be before target date
    const isMandatory = classification === 'Mandatory Prerequisite';
    const latestCompletion = isMandatory ? targetDate : null;

    // Recommended planning window: 3-6 months before target for mandatory, 0-3 months for readiness
    let recommendedWindow;
    if (isMandatory) {
      const recDate = new Date(target);
      recDate.setMonth(recDate.getMonth() - 6);
      recommendedWindow = recDate.toISOString().slice(0, 10);
    } else if (classification === 'Readiness-enhancing') {
      const recDate = new Date(target);
      recDate.setMonth(recDate.getMonth() - 3);
      recommendedWindow = recDate.toISOString().slice(0, 10);
    } else {
      recommendedWindow = null; // Developmental: flexible
    }

    // Check if person already has this course
    const status = 'Required';

    // Available course dates
    const availableDates = courseInfo?.course_dates || [];

    return {
      course: courseName,
      classification,
      skillAddressed: courseInfo?.skills_developed?.[0] || '—',
      qualificationAwarded: courseInfo?.qualification_awarded || '—',
      recommendedWindow,
      latestCompletion,
      status,
      availableDates,
      prerequisites: courseInfo?.prerequisites || []
    };
  });
}

// ─── Pathway Status ──────────────────────────────────────────

export function computePathwayStatus(gaps, coursePlan, targetDate) {
  const today = new Date();
  const target = new Date(targetDate);
  const monthsToTarget = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

  const statuses = [];
  const criticalGaps = [];

  // Check skill gaps
  if (gaps.skillGaps.length > 0) {
    const largeGaps = gaps.skillGaps.filter(g => g.gap >= 2);
    if (largeGaps.length > 0) {
      statuses.push('DEVELOPMENT GAP');
      criticalGaps.push(`${largeGaps.length} skill gap(s) of 2+ levels`);
    }
  }

  // Check qualification gaps
  if (gaps.missingQuals.length > 0) {
    statuses.push('DEVELOPMENT GAP');
    criticalGaps.push(`${gaps.missingQuals.length} mandatory qualification(s) missing`);
  }

  // Check course dependencies
  const mandatoryCourses = coursePlan.filter(c => c.classification === 'Mandatory Prerequisite');
  if (mandatoryCourses.length > 0) {
    const insufficientTime = mandatoryCourses.some(c => {
      if (!c.recommendedWindow) return false;
      const recDate = new Date(c.recommendedWindow);
      return recDate < today;
    });
    if (insufficientTime) {
      statuses.push('COURSE DEPENDENCY');
      criticalGaps.push('Mandatory course planning window has passed');
    }
  }

  // Check experience gaps
  if (gaps.missingQuals.length === 0 && gaps.skillGaps.length === 0 && gaps.missingMandatoryCourses.length === 0) {
    statuses.push('ON TRACK');
  } else if (monthsToTarget < 6 && (gaps.skillGaps.length > 0 || gaps.missingMandatoryCourses.length > 0)) {
    statuses.push('TIMELINE CONFLICT');
    criticalGaps.push(`Only ${monthsToTarget} months to target with outstanding requirements`);
  } else if (criticalGaps.length === 0) {
    statuses.push('AT RISK');
  }

  // Current vs target readiness
  const currentReadiness = gaps.match.readiness;
  let targetReadiness = 'Ready';
  if (gaps.hasGaps) {
    targetReadiness = gaps.skillGaps.some(g => g.gap >= 2) ? 'Longer-term Candidate' : 'Ready with Development';
  }

  // Next required action
  let nextAction = 'No gaps identified — pathway on track';
  if (gaps.missingMandatoryCourses.length > 0) {
    nextAction = `Complete mandatory course: ${gaps.missingMandatoryCourses[0].course || gaps.missingMandatoryCourses[0]}`;
  } else if (gaps.missingQuals.length > 0) {
    nextAction = `Obtain qualification: ${gaps.missingQuals[0]}`;
  } else if (gaps.skillGaps.length > 0) {
    nextAction = `Develop skill: ${gaps.skillGaps[0].skill} (gap: ${gaps.skillGaps[0].gap} level${gaps.skillGaps[0].gap > 1 ? 's' : ''})`;
  }

  return {
    primaryStatus: statuses[0] || 'ON TRACK',
    allStatuses: statuses,
    criticalGaps,
    currentReadiness,
    targetReadiness,
    nextAction,
    monthsToTarget
  };
}

// ─── Full Pathway Computation ───────────────────────────────

export function computeCareerPathway(person, targetAppointment, targetDate, allAppointments, options = {}) {
  const gaps = identifyGaps(person, targetAppointment, options);
  const intermediates = suggestIntermediateAppointments(person, targetAppointment, gaps, allAppointments, options);
  const coursePlan = planCourses(gaps, targetDate, options.coursesLibrary || []);
  const status = computePathwayStatus(gaps, coursePlan, targetDate);

  // Build the pathway stages
  const stages = [];
  // Current
  stages.push({
    type: 'current',
    appointment: {
      title: person.current_appointment || 'Current Appointment',
      rank_requirement: person.rank,
      vocation_requirement: person.vocation
    },
    person,
    readiness: gaps.match.readiness,
    isCurrent: true
  });
  // Intermediates
  intermediates.forEach((s, i) => {
    stages.push({
      type: 'intermediate',
      appointment: s.appointment,
      reason: s.reason,
      addressedGaps: s.addressedGaps,
      gapType: s.gapType,
      stageNumber: i + 1
    });
  });
  // Target
  stages.push({
    type: 'target',
    appointment: targetAppointment,
    targetDate,
    readiness: status.targetReadiness,
    isTarget: true
  });

  return { gaps, intermediates, coursePlan, status, stages };
}