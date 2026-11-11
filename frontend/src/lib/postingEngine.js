// Posting Engine — rule-compliant two-way matching with full explainability.
// Follows: Eligibility → Feasibility → Suitability → Readiness → Preference → Development → Decision
// No opaque match score. Every decision is explainable by component.

export const PROFICIENCY = { 1: 'Awareness', 2: 'Working', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

// Format vocation requirement for display (handles string, array, and empty cases)
export function formatVocations(vr) {
  if (Array.isArray(vr)) {
    const filtered = vr.filter(v => v && v !== 'Any');
    return filtered.length === 0 ? 'Any' : filtered.join(', ');
  }
  return vr && vr !== 'Any' ? vr : 'Any';
}

// Normalize vocation requirement to an array of acceptable vocations (excludes 'Any' and empty)
export function normalizeVocationReq(vr) {
  if (Array.isArray(vr)) return vr.filter(v => v && v !== 'Any');
  return (vr && vr !== 'Any') ? [vr] : [];
}

export const READINESS = {
  'Ready': { cls: 'text-ready', label: 'Ready' },
  'Ready with Development': { cls: 'text-review', label: 'Ready with Development' },
  'Longer-term Candidate': { cls: 'text-review', label: 'Longer-term Candidate' },
  'Review Required': { cls: 'text-review', label: 'Review Required' },
  'Not Eligible': { cls: 'text-destructive', label: 'Not Eligible' }
};

function ordinal(n) {
  return ['1st', '2nd', '3rd'][n - 1] || `${n}th`;
}

// Normalise required_courses to objects regardless of whether they're strings or objects.
function normaliseCourses(raw) {
  return (raw || []).map(c =>
    typeof c === 'string'
      ? { course: c, classification: 'Mandatory Prerequisite' }
      : { course: c.course || c.course_name, classification: c.classification || 'Mandatory Prerequisite' }
  );
}

// Find related courses for a skill from the skills library.
function findRelatedCourses(skillName, skillsLibrary) {
  if (!skillsLibrary) return [];
  const skill = skillsLibrary.find(s => s.skill_name === skillName);
  return skill?.related_courses || [];
}

// Match a person against a single appointment.
// options: { skillsLibrary, courses } — optional, for development recommendations.
export function matchPersonToAppointment(person, appointment, options = {}) {
  const checks = [];
  const skillsGap = [];
  const courseGaps = [];
  const developmentOptions = [];

  // ═══════════════════════════════════════════
  // PRIORITY 1 — MANDATORY ELIGIBILITY
  // ═══════════════════════════════════════════

  // --- Rank ---
  if (!person.rank) {
    checks.push({ criterion: 'Rank', type: 'hard', priority: 'Eligibility', status: 'review', detail: 'Rank not recorded — missing data' });
  } else if (person.rank === appointment.rank_requirement) {
    checks.push({ criterion: 'Rank', type: 'hard', priority: 'Eligibility', status: 'pass', detail: `${person.rank} matches required ${appointment.rank_requirement}` });
  } else {
    checks.push({ criterion: 'Rank', type: 'hard', priority: 'Eligibility', status: 'fail', detail: `${person.rank} does not match required ${appointment.rank_requirement}` });
  }

  // --- Vocation (supports multiple acceptable vocations) ---
  const vocReqs = normalizeVocationReq(appointment.vocation_requirement);
  if (vocReqs.length === 0) {
    checks.push({ criterion: 'Vocation', type: 'hard', priority: 'Eligibility', status: 'pass', detail: 'No vocation restriction — any vocation accepted' });
  } else if (!person.vocation) {
    checks.push({ criterion: 'Vocation', type: 'hard', priority: 'Eligibility', status: 'review', detail: 'Vocation not recorded — missing data' });
  } else if (vocReqs.includes(person.vocation)) {
    checks.push({ criterion: 'Vocation', type: 'hard', priority: 'Eligibility', status: 'pass', detail: `${person.vocation} matches required (${vocReqs.join(', ')})` });
  } else {
    checks.push({ criterion: 'Vocation', type: 'hard', priority: 'Eligibility', status: 'fail', detail: `${person.vocation} not in required (${vocReqs.join(', ')})` });
  }

  // --- Mandatory Qualifications (Rule 4: distinguish not-met from missing-data) ---
  const reqQuals = appointment.mandatory_qualifications || [];
  const personQuals = (person.qualifications || []).map(q => q.qualification);
  if (reqQuals.length > 0 && (person.qualifications || []).length === 0) {
    checks.push({ criterion: 'Mandatory Qualifications', type: 'hard', priority: 'Eligibility', status: 'review', detail: 'No qualification data recorded — cannot confirm requirements' });
  } else {
    const missingQuals = reqQuals.filter(q => !personQuals.includes(q));
    checks.push({
      criterion: 'Mandatory Qualifications', type: 'hard', priority: 'Eligibility',
      status: missingQuals.length > 0 ? 'fail' : 'pass',
      detail: missingQuals.length > 0 ? `Missing: ${missingQuals.join(', ')}` : `${reqQuals.length} required, all held`
    });
  }

  // --- Mandatory Courses (Rule 14: classification) ---
  const allReqCourses = normaliseCourses(appointment.required_courses);
  const mandatoryCourses = allReqCourses.filter(c => c.classification === 'Mandatory Prerequisite');
  const personCourses = (person.courses || []).map(c => c.course);
  if (mandatoryCourses.length > 0 && (person.courses || []).length === 0) {
    checks.push({ criterion: 'Mandatory Courses', type: 'hard', priority: 'Eligibility', status: 'review', detail: 'No course data recorded — cannot confirm mandatory courses' });
  } else {
    const missingMandatory = mandatoryCourses.filter(c => !personCourses.includes(c.course));
    checks.push({
      criterion: 'Mandatory Courses', type: 'hard', priority: 'Eligibility',
      status: missingMandatory.length > 0 ? 'fail' : 'pass',
      detail: missingMandatory.length > 0 ? `Missing: ${missingMandatory.map(c => c.course).join(', ')}` : `${mandatoryCourses.length} mandatory, all completed`
    });
  }

  // ═══════════════════════════════════════════
  // PRIORITY 2 — POSTING FEASIBILITY
  // ═══════════════════════════════════════════

  const avail = person.posting_availability;
  if (!avail || !avail.earliest_posting_date) {
    checks.push({ criterion: 'Availability', type: 'hard', priority: 'Feasibility', status: 'review', detail: 'Posting availability not recorded — HR review required' });
  } else {
    const availOk = avail.earliest_posting_date <= appointment.start_date;
    const restricted = (avail.posting_restrictions || []).length > 0;
    checks.push({
      criterion: 'Availability', type: 'hard', priority: 'Feasibility',
      status: !availOk ? 'fail' : restricted ? 'review' : 'pass',
      detail: restricted
        ? `Available ${avail.earliest_posting_date} — restriction: ${avail.posting_restrictions.join(', ')}`
        : `Available ${avail.earliest_posting_date} vs window from ${appointment.start_date}`
    });
  }

  // ═══════════════════════════════════════════
  // PRIORITY 3 — APPOINTMENT SUITABILITY
  // ═══════════════════════════════════════════

  // --- Required Tags (Desired — not mandatory) ---
  const reqTags = appointment.required_tags || [];
  const personTags = person.hr_tags || [];
  const missingTags = reqTags.filter(t => !personTags.includes(t));
  checks.push({
    criterion: 'Required Tags', type: 'soft', priority: 'Suitability',
    status: missingTags.length > 0 ? 'review' : 'pass',
    detail: missingTags.length > 0 ? `Missing desired: ${missingTags.join(', ')}` : `All desired tags present`
  });

  // ═══════════════════════════════════════════
  // PRIORITY 3b — SKILLS FIT (Rule 11: mandatory minimum + desired proficiency)
  // ═══════════════════════════════════════════

  // Required Skills — all desired (not mandatory). Gaps are development gaps, not eligibility failures.
  const reqSkills = appointment.required_skills || [];
  const personSkills = person.skills || [];
  let softSkillGaps = 0;
  let maxGapSize = 0;

  reqSkills.forEach(rs => {
    const ps = personSkills.find(s => s.skill === rs.skill);
    const current = ps?.proficiency || 0;
    const desired = rs.desired_proficiency || rs.proficiency;

    let gapType = 'none';
    let gap = 0;

    if (current === 0 && !ps) {
      gapType = 'missing-soft';
      gap = desired;
    } else if (current < desired) {
      gapType = 'development-gap';
      gap = desired - current;
    }

    if (gap > 0 && gap > maxGapSize) maxGapSize = gap;

    skillsGap.push({
      skill: rs.skill,
      required: rs.proficiency,
      desired,
      individual: current,
      gap,
      gapType,
      mandatory: false,
      evidence: ps?.evidence || 'No evidence recorded',
      last_validated: ps?.last_validated || '—',
      verification: ps?.verification_status || '—'
    });

    if (gapType === 'development-gap' || gapType === 'missing-soft') softSkillGaps++;
  });

  checks.push({
    criterion: 'Required Skills', type: 'soft', priority: 'Skills',
    status: softSkillGaps > 0 ? 'review' : 'pass',
    detail: softSkillGaps > 0
      ? `${softSkillGaps} desired skill gap(s) — ready with development`
      : `${reqSkills.length} skills, all met at desired proficiency`
  });

  // ═══════════════════════════════════════════
  // COURSE CLASSIFICATION (Rule 14: Readiness-enhancing + Developmental)
  // ═══════════════════════════════════════════

  const readinessCourses = allReqCourses.filter(c => c.classification === 'Readiness-enhancing');
  const developmentalCourses = allReqCourses.filter(c => c.classification === 'Developmental');
  const missingReadiness = readinessCourses.filter(c => !personCourses.includes(c.course));

  if (missingReadiness.length > 0) {
    checks.push({
      criterion: 'Readiness-Enhancing Courses', type: 'soft', priority: 'Readiness',
      status: 'review',
      detail: `Not completed: ${missingReadiness.map(c => c.course).join(', ')} — readiness-enhancing (not mandatory)`
    });
  }

  // ═══════════════════════════════════════════
  // PRIORITY 5 — EMPLOYEE CAREER PREFERENCE
  // ═══════════════════════════════════════════

  const prefs = person.career_aspirations?.preferred_appointments || [];
  const prefIdx = prefs.findIndex(p =>
    appointment.title.toLowerCase().includes(p.toLowerCase()) ||
    p.toLowerCase().includes(appointment.title.toLowerCase())
  );
  checks.push({
    criterion: 'Career Preference', type: 'soft', priority: 'Preference',
    status: prefIdx >= 0 ? 'pass' : prefs.length === 0 ? 'review' : 'neutral',
    detail: prefIdx >= 0
      ? `${ordinal(prefIdx + 1)} stated preference`
      : prefs.length === 0 ? 'No preference stated' : 'Not in stated preferences'
  });

  // ═══════════════════════════════════════════
  // DEVELOPMENT RECOMMENDATIONS (Rule 15: gap → course/intervention)
  // ═══════════════════════════════════════════

  skillsGap.filter(g => g.gap > 0).forEach(g => {
    const relatedCourses = findRelatedCourses(g.skill, options.skillsLibrary);
    developmentOptions.push({
      skill: g.skill,
      gap: g.gap,
      current: g.individual,
      required: g.required,
      desired: g.desired,
      mandatory: g.mandatory,
      relatedCourses,
      recommendation: relatedCourses.length > 0
        ? `Consider ${relatedCourses[0]}`
        : 'Developmental exposure opportunity'
    });
  });

  // ═══════════════════════════════════════════
  // OVERALL STATUS
  // ═══════════════════════════════════════════

  // 60% criterion threshold — eligibility + skills satisfied (threshold-based eligibility)
  const ELIGIBILITY_THRESHOLD = 0.60;
  const countedChecks = checks.filter(c => c.status === 'pass' || c.status === 'fail' || c.status === 'review');
  const passedChecks = checks.filter(c => c.status === 'pass');
  const satisfactionRate = countedChecks.length > 0 ? passedChecks.length / countedChecks.length : 1;
  const satisfactionPct = Math.round(satisfactionRate * 100);

  const hardFails = checks.filter(c => c.type === 'hard' && c.status === 'fail');
  const reviews = checks.filter(c => c.status === 'review');

  let status = 'Eligible';
  if (satisfactionRate < ELIGIBILITY_THRESHOLD) {
    status = 'Excluded';
  } else if (reviews.length > 0 || softSkillGaps > 0) {
    status = 'Review Required';
  }

  // ═══════════════════════════════════════════
  // READINESS (Rule 16: four statuses + Review Required)
  // ═══════════════════════════════════════════

  let readiness = 'Ready';
  if (status === 'Excluded') {
    readiness = 'Not Eligible';
  } else if (status === 'Review Required') {
    readiness = 'Review Required';
  } else if (softSkillGaps > 0) {
    // Larger gaps (2+ levels) → longer-term; smaller gaps (1 level) → ready with development
    readiness = maxGapSize >= 2 ? 'Longer-term Candidate' : 'Ready with Development';
  }

  // ═══════════════════════════════════════════
  // COMPONENT BREAKDOWN (Rule 10: no opaque score)
  // ═══════════════════════════════════════════

  const hardChecks = checks.filter(c => c.type === 'hard');
  const hardMet = hardChecks.filter(c => c.status === 'pass').length;
  const skillsMet = skillsGap.filter(g => g.gap <= 0).length;

  const components = {
    satisfaction: {
      pct: satisfactionPct,
      threshold: 60,
      met: satisfactionRate >= ELIGIBILITY_THRESHOLD,
      label: `${satisfactionPct}% satisfied (threshold 60%)`
    },
    eligibility: {
      met: hardMet,
      total: hardChecks.length,
      label: `${hardMet}/${hardChecks.length} mandatory criteria met`,
      detail: hardFails.length > 0 ? `${hardFails.length} mandatory criterion not met` : 'All mandatory criteria met'
    },
    skills: {
      met: skillsMet,
      total: skillsGap.length,
      label: `${skillsMet}/${skillsGap.length} desired skills met`,
      detail: softSkillGaps > 0 ? `${softSkillGaps} developmental gap(s)` : 'All skills met'
    },
    availability: {
      met: checks.find(c => c.criterion === 'Availability')?.status === 'pass' ? 1 : 0,
      total: 1,
      label: checks.find(c => c.criterion === 'Availability')?.detail || '—'
    },
    preference: {
      label: prefIdx >= 0 ? `${ordinal(prefIdx + 1)} preference` : prefs.length === 0 ? 'No preference stated' : 'Not in preferences',
      match: prefIdx >= 0
    },
    development: {
      gaps: softSkillGaps,
      label: `${softSkillGaps} gap(s) identified`,
      options: developmentOptions.length
    }
  };

  // Internal ranking for sorting only (not displayed as primary mechanism)
  const _rank = hardMet * 100 + skillsMet * 10 - (softSkillGaps * 2) + (prefIdx >= 0 ? (3 - prefIdx) : 0);

  return { checks, status, readiness, skillsGap, developmentOptions, components, _rank, prefMatch: prefIdx, satisfactionRate, satisfactionPct };
}

// Build the auto-filter funnel — shows population reduction at each hard-filter step.
export function buildFunnel(population, appointment) {
  const steps = [];
  let remaining = [...population];

  const normalisedCourses = normaliseCourses(appointment.required_courses);
  const mandatoryCourseNames = normalisedCourses
    .filter(c => c.classification === 'Mandatory Prerequisite')
    .map(c => c.course);

  const config = [
    { label: 'Initial Population', filter: () => true },
    { label: 'Rank', filter: p => p.rank === appointment.rank_requirement },
    {
      label: 'Vocation',
      filter: p => {
        const vrs = normalizeVocationReq(appointment.vocation_requirement);
        return vrs.length === 0 || vrs.includes(p.vocation);
      }
    },
    {
      label: 'Availability',
      filter: p => {
        const a = p.posting_availability;
        return a && a.earliest_posting_date && a.earliest_posting_date <= appointment.start_date &&
          (!a.posting_restrictions || a.posting_restrictions.length === 0);
      }
    },
    {
      label: 'Mandatory Qualifications',
      filter: p => {
        const rq = appointment.mandatory_qualifications || [];
        const pq = (p.qualifications || []).map(q => q.qualification);
        return rq.every(q => pq.includes(q));
      }
    },
    {
      label: 'Mandatory Courses',
      filter: p => {
        if (mandatoryCourseNames.length === 0) return true;
        const pc = (p.courses || []).map(c => c.course);
        return mandatoryCourseNames.every(c => pc.includes(c));
      }
    }
  ];

  config.forEach((step, i) => {
    if (i === 0) {
      steps.push({ label: step.label, remaining: remaining.length, excludedNames: [] });
    } else {
      const survivors = remaining.filter(step.filter);
      const excluded = remaining.filter(p => !step.filter(p));
      steps.push({
        label: step.label,
        remaining: survivors.length,
        excludedNames: excluded.map(p => p.name)
      });
      remaining = survivors;
    }
  });

  return { steps, finalists: remaining };
}

// Build shortlist — eligible + review candidates sorted by internal rank.
export function buildShortlist(population, appointment, options) {
  return population
    .map(p => ({ person: p, ...matchPersonToAppointment(p, appointment, options) }))
    .filter(r => r.status === 'Eligible' || r.status === 'Review Required')
    .sort((a, b) => b._rank - a._rank);
}

// Mode B: match a person against all appointments.
export function matchPersonToAppointments(person, appointments, options) {
  return appointments
    .map(a => ({ appointment: a, ...matchPersonToAppointment(person, a, options) }))
    .filter(r => r.status !== 'Excluded')
    .sort((a, b) => b._rank - a._rank);
}

// Detect cascading impact: if a candidate is moved to a new appointment,
// check if they're already assigned elsewhere.
export function detectCascade(candidateId, postingAssignments) {
  return postingAssignments.filter(pa =>
    pa.primary_candidate_id === candidateId && pa.status !== 'Unfilled' && pa.status !== 'Replacement Required'
  );
}

// Detect double-booking: a person assigned as primary to multiple appointments.
export function detectDoubleBooking(postingAssignments) {
  const byPerson = {};
  postingAssignments.forEach(pa => {
    if (pa.primary_candidate_id && pa.status !== 'Replacement Required') {
      if (!byPerson[pa.primary_candidate_id]) byPerson[pa.primary_candidate_id] = [];
      byPerson[pa.primary_candidate_id].push(pa);
    }
  });
  return Object.entries(byPerson)
    .filter(([_, pas]) => pas.length > 1)
    .map(([personId, pas]) => ({ personId, personName: pas[0].primary_candidate_name, appointments: pas }));
}