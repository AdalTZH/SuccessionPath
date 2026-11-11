import { base44 } from '@/api/base44Client';

const describe = (v) => {
  if (v == null || v === '') return '—';
  const text = Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  return text.length > 400 ? `${text.slice(0, 397)}…` : text;
};

// A review is recorded as data, never as a silent overwrite: the individual's record is
// updated and the audit trail keeps the original value, the new value and the HR note.
export async function recordReview({ employee, patch, process, audit, rationale, evidence, status = 'Recorded' }) {
  const me = await base44.auth.me().catch(() => null);
  const saved = await base44.entities.Employee.update(employee.id, patch);
  const stamp = new Date().toISOString();
  const entries = (audit || [])
    .filter(a => describe(a.original_value) !== describe(a.new_value))
    .map(a => ({
      individual: employee.name,
      process: a.process || process,
      original_value: describe(a.original_value),
      new_value: describe(a.new_value),
      user: me?.full_name || 'HR Practitioner',
      user_role: me?.role || 'admin',
      timestamp: stamp,
      rationale: rationale || undefined,
      evidence: evidence || undefined,
      status
    }));
  if (entries.length > 0) await base44.entities.AuditRecord.bulkCreate(entries);
  return saved;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}