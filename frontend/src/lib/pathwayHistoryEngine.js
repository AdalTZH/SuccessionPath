// Historical Career Pathway Engine
// Derives observed progression patterns from real appointment history.
// Everything here is descriptive: it reports what has been observed, it never decides.

export function sortHistory(rows = []) {
  return [...rows].sort(
    (a, b) => (a.sequence || 0) - (b.sequence || 0) || String(a.start_date || '').localeCompare(String(b.start_date || ''))
  );
}

export function monthsBetween(startDate, endDate) {
  if (!startDate) return null;
  const s = new Date(startDate);
  const e = endDate ? new Date(endDate) : new Date();
  if (isNaN(s) || isNaN(e)) return null;
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return m < 0 ? 0 : m;
}

export function rowTenureMonths(row) {
  if (row?.duration_months != null) return row.duration_months;
  if (!row?.start_date) return null;
  return monthsBetween(row.start_date, row.is_open_ended ? null : row.end_date);
}

export function tenureLabel(months) {
  if (months == null) return '—';
  const y = Math.floor(months / 12);
  const r = months % 12;
  if (y && r) return `${y}y ${r}m`;
  if (y) return `${y}y`;
  return `${r}m`;
}

// Age in whole years at a given date, from the person's date of birth.
export function ageAtDate(dob, atDate) {
  if (!dob || !atDate) return null;
  const d = new Date(dob);
  const a = new Date(atDate);
  if (isNaN(d) || isNaN(a)) return null;
  let years = a.getFullYear() - d.getFullYear();
  const beforeBirthday = a.getMonth() < d.getMonth() || (a.getMonth() === d.getMonth() && a.getDate() < d.getDate());
  if (beforeBirthday) years -= 1;
  return years < 0 ? null : years;
}

export function labelMatches(text, label) {
  if (!text || !label) return false;
  const a = String(text).trim().toUpperCase();
  const b = String(label).trim().toUpperCase();
  return a === b || a.includes(b) || b.includes(a);
}

// Observed next appointments for a label → used for "most likely next move".
export function nextMoves(pathwayRecord, limit = 5) {
  if (!pathwayRecord) return [];
  return [...(pathwayRecord.typical_successors || [])].slice(0, limit);
}

export function commonOrigins(pathwayRecord, limit = 5) {
  if (!pathwayRecord) return [];
  return [...(pathwayRecord.typical_predecessors || [])].slice(0, limit);
}

export function pct(share) {
  if (share == null) return '—';
  return `${Math.round(share * 100)}%`;
}

export function confidenceLabel(sampleSize) {
  if (!sampleSize || sampleSize < 5) return { text: 'Very small sample', tone: 'weak' };
  if (sampleSize < 20) return { text: 'Small sample', tone: 'weak' };
  if (sampleSize < 60) return { text: 'Moderate sample', tone: 'moderate' };
  return { text: 'Strong sample', tone: 'strong' };
}

export function searchCatalogue(catalogue = [], query = '', limit = 40) {
  const q = query.trim().toLowerCase();
  const pool = q
    ? catalogue.filter(c => String(c.label || '').toLowerCase().includes(q))
    : catalogue;
  return [...pool].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, limit);
}