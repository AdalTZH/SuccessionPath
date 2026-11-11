import { base44 } from '@/api/base44Client';

export const PAGE_SIZE = 60;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Appointment labels come straight from the source workbook's appointment column.
// The column is recorded in upper case, so the search term is matched in the same case.
// `groomingTier` / `speciality` narrow the list to a tag chosen in the population bar.
export function catalogueQuery(term, { occupiedOnly = false, groomingTier, speciality } = {}) {
  const trimmed = (term || '').trim();
  const query = trimmed ? { label: { $regex: escapeRegex(trimmed.toUpperCase()) } } : {};
  if (occupiedOnly) query.current_holders = { $gt: 0 };
  if (groomingTier) query.grooming_tier = groomingTier;
  if (speciality) query.speciality = speciality;
  return query;
}

// `sort` lets a caller place the appointments currently held at the top of the list
// ('-current_holders') instead of ranking by how often the label appears in history.
export async function fetchCataloguePage({ term, cursor, sort = '-usage_count', occupiedOnly = false, groomingTier, speciality }) {
  const options = { sort, limit: PAGE_SIZE };
  if (cursor) options.cursor = cursor;
  const page = await base44.entities.AppointmentCatalogue.filter(catalogueQuery(term, { occupiedOnly, groomingTier, speciality }), options);
  return {
    items: page.items || [],
    nextCursor: page.next_cursor || null,
    hasMore: !!page.has_more
  };
}

export function countCatalogue(term, { occupiedOnly = false, groomingTier, speciality } = {}) {
  return base44.entities.AppointmentCatalogue.count(catalogueQuery(term, { occupiedOnly, groomingTier, speciality }));
}

// The current incumbent(s) of each label: personnel whose open-ended appointment carries it.
// Returned as a map of label → [{ employee_id, name, rank }], in the same shape the cards render.
export async function fetchIncumbents(labels) {
  const unique = [...new Set(labels.filter(Boolean))];
  if (!unique.length) return {};
  const batches = [];
  for (let i = 0; i < unique.length; i += 20) batches.push(unique.slice(i, i + 20));
  const pages = await Promise.all(batches.map(batch =>
    base44.entities.Employee.filter(
      { current_appointment: { $in: batch }, archived: { $ne: true } },
      { limit: 400, sort: 'name' }
    )
  ));
  const byLabel = {};
  pages.forEach(page => (page.items || []).forEach(e => {
    if (!e.current_appointment) return;
    (byLabel[e.current_appointment] ||= []).push({
      employee_id: e.employee_id,
      name: e.name,
      rank: e.rank,
      wrangler: e.wrangler,
      talent: e.talent
    });
  }));
  return byLabel;
}

export async function fetchPathways(labels) {
  if (!labels.length) return {};
  const page = await base44.entities.AppointmentPathway.filter({ label: { $in: labels } }, { limit: 200 });
  const byLabel = {};
  (page.items || []).forEach(p => { byLabel[p.label] = p; });
  return byLabel;
}