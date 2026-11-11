// History-Derived Succession Candidates
// For an appointment, finds the personnel its recorded history points to as successors:
// the appointments that have historically fed into it (observed predecessors / feeder routes),
// and the people whose own recorded history includes those feeder appointments.
// Everything here is descriptive of the recorded population — HR confirms every linkage.

import { base44 } from '@/api/base44Client';
import { pct } from '@/lib/pathwayHistoryEngine';
import { classifySuccessionDepth } from '@/lib/successionEngine';

const FEEDER_LIMIT = 6;
const FEEDER_ROWS = 150;
const HOLDER_ROWS = 300;

// Observed feeder appointments, strongest route first.
export function rankFeeders(pathway, limit = FEEDER_LIMIT) {
  return [...(pathway?.typical_predecessors || [])]
    .filter(p => p?.label)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limit)
    .map((p, i) => ({ label: p.label, count: p.count || 0, share: p.share ?? null, rank: i + 1 }));
}

// The rank most recorded holders of the appointment held — context for HR, not a rule.
export function dominantHolderRank(holderRows = []) {
  const counts = {};
  holderRows.forEach(h => { if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? { rank: top[0], count: top[1], total: holderRows.length } : null;
}

// One entry per person: the feeder routes they have actually held.
// Ordering is explainable — feeder strength, then number of routes, then recency.
export function rankHistoryCandidates({ feeders = [], feederRows = new Map(), employeesById = new Map(), excludeIds = new Set() }) {
  const byPerson = new Map();

  feeders.forEach(feeder => {
    (feederRows.get(feeder.label) || []).forEach(row => {
      if (!row?.employee_id || excludeIds.has(row.employee_id)) return;
      const person = employeesById.get(row.employee_id);
      if (!person) return;

      let entry = byPerson.get(row.employee_id);
      if (!entry) {
        entry = { employee_id: row.employee_id, person, routes: [], strength: 0, latest_start: '' };
        byPerson.set(row.employee_id, entry);
      }
      if (entry.routes.some(r => r.label === feeder.label)) return;

      entry.routes.push({
        ...feeder,
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        is_open_ended: !!row.is_open_ended
      });
      entry.strength += feeder.share || 0;
      if (String(row.start_date || '') > entry.latest_start) entry.latest_start = String(row.start_date || '');
    });
  });

  return [...byPerson.values()]
    .map(c => ({ ...c, routes: [...c.routes].sort((a, b) => a.rank - b.rank) }))
    .sort((a, b) =>
      b.strength - a.strength ||
      b.routes.length - a.routes.length ||
      b.latest_start.localeCompare(a.latest_start) ||
      String(a.person.name).localeCompare(String(b.person.name))
    );
}

// Loads the recorded history behind one appointment and returns its suggested candidates.
export async function loadHistoryCandidates({ label, pathway, employees }) {
  const feeders = rankFeeders(pathway);
  const employeesById = new Map(employees.map(e => [e.employee_id, e]));

  const [holderPage, ...feederPages] = await Promise.all([
    base44.entities.AppointmentHistory.filter({ appointment: label }, { sort: '-start_date', limit: HOLDER_ROWS }),
    ...feeders.map(f => base44.entities.AppointmentHistory.filter({ appointment: f.label }, { sort: '-start_date', limit: FEEDER_ROWS }))
  ]);

  const holders = holderPage.items || [];
  const feederRows = new Map(feeders.map((f, i) => [f.label, feederPages[i].items || []]));
  // Anyone who has already held this appointment — including the current holder — is not a successor candidate.
  const excludeIds = new Set(holders.map(h => h.employee_id));

  return {
    feeders,
    holders,
    incumbent: holders.find(h => h.is_current) || null,
    dominantRank: dominantHolderRank(holders),
    candidates: rankHistoryCandidates({ feeders, feederRows, employeesById, excludeIds })
  };
}

// ── Plan slot population ─────────────────────────────────────────────────────
const SLOT_KEYS = [
  { role: 'Primary Successor', id: 'primary_successor_id', name: 'primary_successor_name' },
  { role: 'Alternate 1', id: 'alternate1_id', name: 'alternate1_name' },
  { role: 'Alternate 2', id: 'alternate2_id', name: 'alternate2_name' }
];

// Places the strongest candidates in the plan's empty slots. Slots HR has already filled are kept
// as they are, and nobody is placed in two slots of the same plan.
export function assignSlotCandidates(plan, candidates = []) {
  const taken = new Set(SLOT_KEYS.map(s => plan?.[s.id]).filter(Boolean));
  const queue = candidates.filter(c => !taken.has(c.employee_id));
  const assignment = {};
  const basis = [];

  SLOT_KEYS.forEach(slot => {
    if (plan?.[slot.id]) return;
    const next = queue.shift();
    if (!next) return;
    assignment[slot.id] = next.employee_id;
    assignment[slot.name] = next.person.name;
    const route = next.routes[0];
    basis.push(`${slot.role}: ${next.person.name} via ${route.label} (${pct(route.share)} of arrivals, ${route.count} recorded move(s))`);
  });

  return { assignment, basis };
}

// Fills every plan's empty successor slots from recorded history and records the change in the audit trail.
export async function fillSuccessionSlotsFromHistory({ plans = [], employees = [], appointments = [] }) {
  const me = await base44.auth.me().catch(() => null);
  const stamp = new Date().toISOString();
  const results = [];
  const auditEntries = [];

  for (const plan of plans) {
    const label = plan.appointment_id || plan.appointment_title;
    if (!label || SLOT_KEYS.every(s => plan[s.id])) {
      results.push({ plan, status: 'skipped', filled: 0 });
      continue;
    }

    const page = await base44.entities.AppointmentPathway.filter({ label }, { limit: 1 });
    const pathway = (page.items || [])[0] || null;
    const { candidates } = await loadHistoryCandidates({ label, pathway, employees });
    const { assignment, basis } = assignSlotCandidates(plan, candidates);
    const filled = SLOT_KEYS.filter(s => assignment[s.id]).length;

    if (filled === 0) {
      results.push({ plan, status: 'no-candidates', filled: 0 });
      continue;
    }

    const next = { ...plan, ...assignment, successor_basis: 'History-derived', successor_evidence: basis.join(' · ') };
    const updated = await base44.entities.SuccessionPlan.update(plan.id, {
      ...assignment,
      successor_basis: next.successor_basis,
      successor_evidence: next.successor_evidence,
      succession_depth: classifySuccessionDepth(next, employees, appointments)
    });

    auditEntries.push({
      individual: plan.appointment_title || label,
      process: 'Succession Slot Suggestion — History-Derived',
      original_value: 'Unassigned',
      new_value: basis.join(' · '),
      user: me?.full_name || 'HR Practitioner',
      user_role: me?.role || 'admin',
      timestamp: stamp,
      evidence: `Appointment ${label} — candidate feeder routes from recorded appointment history`,
      rationale: 'History-derived indication for linkage testing. Not an approved succession decision — HR confirmation required.',
      status: 'Governance Review Required'
    });

    results.push({ plan: updated, status: 'filled', filled });
  }

  if (auditEntries.length > 0) await base44.entities.AuditRecord.bulkCreate(auditEntries);
  return results;
}