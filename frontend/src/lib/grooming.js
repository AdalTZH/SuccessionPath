// Grooming rules. A P1/P2 appointment is a grooming appointment: it is meant for a tagged talent.
// Two mismatches are flagged: a non-talent placed into one, and a talent + wrangler who is not in one.
export const TALENT_TIERS = ['T1', 'T1+'];

export function isTalent(employee) {
  return TALENT_TIERS.includes(employee?.talent);
}

export function isWrangler(employee) {
  return employee?.wrangler === 'Y';
}

// Planned placements (posting assignments) sitting in a grooming appointment without a talent tag.
export function groomingMismatches(assignments, tierByLabel, employeeById) {
  return (assignments || [])
    .filter(a => !a.hr_override && a.primary_candidate_id)
    .map(a => {
      const label = a.appointment_title || a.appointment_id;
      const tier = tierByLabel[label];
      const employee = employeeById[a.primary_candidate_id];
      if (!tier || !employee || isTalent(employee)) return null;
      return {
        id: a.id,
        appointment: label,
        tier: tier.grooming_tier,
        speciality: tier.speciality,
        employee
      };
    })
    .filter(Boolean);
}

// Where one individual stands: a talent + wrangler belongs in a P1/P2 appointment.
export function groomingStanding(employee, tierByLabel) {
  const tier = tierByLabel?.[employee?.current_appointment] || '';
  if (!isTalent(employee) || !isWrangler(employee)) return { required: false, placed: false, tier };
  return { required: true, placed: !!tier, tier };
}

// Every grooming case in the population at once — used wherever the rule is surfaced.
export function groomingCases(planned, employees, tierByLabel) {
  const employeeById = Object.fromEntries((employees || []).map(e => [e.employee_id, e]));
  return {
    placements: groomingMismatches(planned, tierByLabel, employeeById),
    unplaced: unplacedTalents(employees, tierByLabel)
  };
}

// Talent + wrangler individuals whose current appointment is not a P1/P2 grooming appointment.
export function unplacedTalents(employees, tierByLabel) {
  return (employees || [])
    .filter(e => isTalent(e) && isWrangler(e) && !tierByLabel[e.current_appointment])
    .map(e => ({
      id: `talent-${e.id}`,
      appointment: e.current_appointment,
      employee: e
    }));
}