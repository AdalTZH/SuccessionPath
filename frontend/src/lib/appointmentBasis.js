import { base44 } from '@/api/base44Client';

const VOCATION_SHARE_FLOOR = 0.1;

// The imported workbook carries no requirement columns, so the basis for matching an
// appointment is derived from the rank and vocation recorded on its own history rows.
export async function fetchAppointmentBasis(label) {
  const [rankAgg, vocationAgg, pathwayPage] = await Promise.all([
    base44.entities.AppointmentHistory.aggregate({ query: { appointment: label }, groupBy: 'rank' }),
    base44.entities.AppointmentHistory.aggregate({ query: { appointment: label }, groupBy: 'vocation' }),
    base44.entities.AppointmentPathway.filter({ label }, { limit: 1 })
  ]);

  const ranks = (rankAgg.rows || [])
    .filter(r => r.rank)
    .map(r => ({ value: r.rank, count: r.count }))
    .sort((a, b) => b.count - a.count);

  const vocations = (vocationAgg.rows || [])
    .filter(v => v.vocation)
    .map(v => ({ value: v.vocation, count: v.count }))
    .sort((a, b) => b.count - a.count);

  return { label, ranks, vocations, pathway: (pathwayPage.items || [])[0] || null };
}

// Requirement object the matching engine runs against. Rank and vocation come from the
// recorded holders; everything the workbook does not record is left empty.
export function buildDerivedRequirement(label, basis) {
  const total = basis.ranks.reduce((sum, r) => sum + r.count, 0);
  return {
    appointment_id: label,
    title: label,
    rank_requirement: basis.ranks[0]?.value || '',
    vocation_requirement: basis.vocations
      .filter(v => total === 0 || v.count / total >= VOCATION_SHARE_FLOOR)
      .map(v => v.value),
    mandatory_qualifications: [],
    required_courses: [],
    required_tags: [],
    required_skills: [],
    start_date: new Date().toISOString().slice(0, 10),
    vacancy_status: 'Open',
    basis_derived: true
  };
}

// Candidate assignments are held against the workbook appointment label.
export async function resolveAssignment(label) {
  const existing = await base44.entities.PostingAssignment.filter({ appointment_id: label }, { limit: 1 });
  if (existing.items?.length) return existing.items[0];
  return base44.entities.PostingAssignment.create({ appointment_id: label, appointment_title: label, status: 'Unfilled' });
}