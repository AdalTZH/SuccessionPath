// Succession Engine — succession depth, dependency mapping, contingency analysis.
// Works alongside the posting engine to provide explainable succession intelligence.

import { matchPersonToAppointment, normalizeVocationReq } from './postingEngine';

// ─── Succession Depth Classification ───
// Healthy: 2+ credible successors including at least 1 READY
// Limited: Only 1 credible ready/near-ready successor
// At Risk: No READY successor
// Vacant/Critical: No credible successor identified
export function classifySuccessionDepth(plan, employees, appointments) {
  if (!plan) return 'Vacant/Critical';

  const appt = appointments.find(a => a.appointment_id === plan.appointment_id);
  if (!appt) return plan.succession_depth || 'Vacant/Critical';

  const successorIds = [
    plan.primary_successor_id,
    plan.alternate1_id,
    plan.alternate2_id
  ].filter(Boolean);

  if (successorIds.length === 0 && (plan.development_pipeline || []).length === 0) {
    return 'Vacant/Critical';
  }

  const results = successorIds.map(id => {
    const person = employees.find(e => e.employee_id === id);
    if (!person) return null;
    return matchPersonToAppointment(person, appt);
  }).filter(Boolean);

  const readyCount = results.filter(r => r.readiness === 'Ready').length;
  const readyWithDevCount = results.filter(r => r.readiness === 'Ready with Development').length;
  const credibleCount = readyCount + readyWithDevCount;

  if (credibleCount >= 2 && readyCount >= 1) return 'Healthy';
  if (credibleCount >= 1) return 'Limited';
  if (successorIds.length > 0 || (plan.development_pipeline || []).length > 0) return 'At Risk';
  return 'Vacant/Critical';
}

// ─── Succession Chain Builder ───
// Builds the visual chain: Current Holder → Primary → Alt1 → Alt2 → Pipeline
export function buildSuccessionChain(plan, employees, appointments) {
  if (!plan) return null;
  const appt = appointments.find(a => a.appointment_id === plan.appointment_id);

  const getNode = (id, name, role) => {
    if (!id) return { id: null, name: name || '—', role, status: 'Unassigned', readiness: null, matchResult: null };
    const person = employees.find(e => e.employee_id === id);
    if (!person) return { id, name: name || id, role, status: 'Not Found', readiness: null, matchResult: null };
    const matchResult = appt ? matchPersonToAppointment(person, appt) : null;
    return {
      id,
      name: person.name,
      role,
      person,
      status: matchResult?.status || '—',
      readiness: matchResult?.readiness || '—',
      satisfactionPct: matchResult?.satisfactionPct || 0,
      matchResult
    };
  };

  return {
    appointment: appt,
    currentHolder: plan.current_holder_id ? getNode(plan.current_holder_id, plan.current_holder_name, 'Current Holder') : null,
    primary: getNode(plan.primary_successor_id, plan.primary_successor_name, 'Primary Successor'),
    alternate1: getNode(plan.alternate1_id, plan.alternate1_name, 'Alternate 1'),
    alternate2: getNode(plan.alternate2_id, plan.alternate2_name, 'Alternate 2'),
    pipeline: (plan.development_pipeline || []).map(id => {
      const person = employees.find(e => e.employee_id === id);
      return person ? { id, name: person.name, person, role: 'Pipeline' } : { id, name: id, role: 'Pipeline' };
    })
  };
}

// ─── Cross-Appointment Dependency Mapping ───
// Find all succession plans where a person appears as primary/alternate/pipeline.
export function findPersonInSuccessionPlans(personId, plans) {
  const results = [];
  plans.forEach(plan => {
    if (plan.primary_successor_id === personId) {
      results.push({ plan, role: 'Primary Successor' });
    }
    if (plan.alternate1_id === personId) {
      results.push({ plan, role: 'Alternate 1' });
    }
    if (plan.alternate2_id === personId) {
      results.push({ plan, role: 'Alternate 2' });
    }
    if ((plan.development_pipeline || []).includes(personId)) {
      results.push({ plan, role: 'Development Pipeline' });
    }
  });
  return results;
}

// Detect candidates who appear in multiple succession pipelines (competing demand).
export function detectCompetingDemand(plans) {
  const byPerson = {};
  plans.forEach(plan => {
    [
      { id: plan.primary_successor_id, role: 'Primary Successor' },
      { id: plan.alternate1_id, role: 'Alternate 1' },
      { id: plan.alternate2_id, role: 'Alternate 2' }
    ].forEach(({ id, role }) => {
      if (id) {
        if (!byPerson[id]) byPerson[id] = [];
        byPerson[id].push({ plan, role });
      }
    });
  });
  return Object.entries(byPerson)
    .filter(([_, entries]) => entries.length > 1)
    .map(([personId, entries]) => ({ personId, personName: entries[0].plan.primary_successor_name, entries }));
}

// ─── Contingency Analysis ───
// When a person becomes unavailable, identify every affected appointment and succession pipeline,
// re-run eligibility, and identify cascading consequences.
export function analyzeContingency(unavailablePersonId, plans, employees, appointments) {
  const affectedPlans = findPersonInSuccessionPlans(unavailablePersonId, plans);
  const unavailablePerson = employees.find(e => e.employee_id === unavailablePersonId);
  const scenarios = [];

  affectedPlans.forEach(({ plan, role }) => {
    const appt = appointments.find(a => a.appointment_id === plan.appointment_id);
    if (!appt) return;

    // Determine which successors remain
    const remainingSuccessors = [];
    if (plan.primary_successor_id && plan.primary_successor_id !== unavailablePersonId) {
      remainingSuccessors.push({ id: plan.primary_successor_id, name: plan.primary_successor_name, role: 'Primary Successor' });
    }
    if (plan.alternate1_id && plan.alternate1_id !== unavailablePersonId) {
      remainingSuccessors.push({ id: plan.alternate1_id, name: plan.alternate1_name, role: 'Alternate 1' });
    }
    if (plan.alternate2_id && plan.alternate2_id !== unavailablePersonId) {
      remainingSuccessors.push({ id: plan.alternate2_id, name: plan.alternate2_name, role: 'Alternate 2' });
    }

    // If the primary is unavailable, the next alternate becomes the candidate to promote
    let promotionCandidate = null;
    if (role === 'Primary Successor') {
      // Next viable: alternate1, alternate2, or search population
      if (plan.alternate1_id) {
        const alt1Person = employees.find(e => e.employee_id === plan.alternate1_id);
        if (alt1Person) {
          const matchResult = matchPersonToAppointment(alt1Person, appt);
          promotionCandidate = {
            person: alt1Person,
            id: plan.alternate1_id,
            name: plan.alternate1_name,
            matchResult,
            readiness: matchResult.readiness,
            satisfactionPct: matchResult.satisfactionPct
          };
        }
      }
    }

    // Check if the promotion candidate has competing demand (is a successor elsewhere)
    let competingDemand = null;
    if (promotionCandidate) {
      const otherPlans = plans.filter(p => p.appointment_id !== plan.appointment_id);
      const competing = findPersonInSuccessionPlans(promotionCandidate.id, otherPlans);
      if (competing.length > 0) {
        competingDemand = competing;
      }
    }

    // Search for newly eligible candidates not previously shortlisted
    const currentSuccessorIds = [
      plan.primary_successor_id,
      plan.alternate1_id,
      plan.alternate2_id,
      ...(plan.development_pipeline || [])
    ].filter(Boolean);

    const newCandidates = employees
      .filter(e => !currentSuccessorIds.includes(e.employee_id) && e.employee_id !== unavailablePersonId)
      .map(e => ({ person: e, ...matchPersonToAppointment(e, appt) }))
      .filter(r => r.status === 'Eligible' || r.status === 'Review Required')
      .sort((a, b) => b._rank - a._rank)
      .slice(0, 3);

    scenarios.push({
      plan,
      appointment: appt,
      unavailableRole: role,
      remainingSuccessors,
      promotionCandidate,
      competingDemand,
      newCandidates,
      circularRisk: false
    });
  });

  // Detect circular dependencies
  const visited = new Set();
  const chain = [];
  const detectCircular = (personId, depth = 0) => {
    if (depth > 10) return true; // safety limit
    if (visited.has(personId)) {
      chain.push(personId);
      return true;
    }
    visited.add(personId);
    chain.push(personId);

    const personPlans = findPersonInSuccessionPlans(personId, plans);
    for (const { plan } of personPlans) {
      if (plan.primary_successor_id && plan.primary_successor_id !== personId) {
        if (detectCircular(plan.primary_successor_id, depth + 1)) return true;
      }
    }
    return false;
  };

  const circularDetected = detectCircular(unavailablePersonId);

  return {
    unavailablePerson,
    affectedPlans: affectedPlans.map(({ plan, role }) => ({ plan, role })),
    scenarios,
    circularDetected,
    chain
  };
}

// ─── Succession Risk Summary ───
export function buildSuccessionRiskSummary(plans, employees, appointments) {
  const depthCounts = { Healthy: 0, Limited: 0, 'At Risk': 0, 'Vacant/Critical': 0 };
  const risks = [];

  plans.forEach(plan => {
    const depth = classifySuccessionDepth(plan, employees, appointments);
    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    if (depth === 'At Risk' || depth === 'Vacant/Critical') {
      risks.push({ plan, depth, appointment_title: plan.appointment_title });
    }
  });

  const competingDemand = detectCompetingDemand(plans);

  return { depthCounts, risks, competingDemand };
}