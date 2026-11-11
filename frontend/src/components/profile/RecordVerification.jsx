import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ReviewPill } from '@/components/badges';
import EditFieldsDialog from '@/components/profile/EditFieldsDialog';
import { recordReview } from '@/lib/profileUpdates';

const SKILL_FIELDS = [
  { key: 'skill', label: 'Skill', type: 'text' },
  { key: 'proficiency', label: 'Proficiency', type: 'select', options: ['1', '2', '3', '4', '5'], help: '1 Awareness · 2 Working · 3 Proficient · 4 Advanced · 5 Expert' },
  { key: 'evidence', label: 'Supporting Evidence', type: 'textarea', rows: 2 },
  { key: 'evidence_source', label: 'Evidence Source', type: 'text' },
  { key: 'last_validated', label: 'Last Validated', type: 'date' },
  { key: 'verification_status', label: 'Verification Status', type: 'select', options: ['Pending', 'Verified'] },
  { key: 'verified_by', label: 'Verified By (Supervisor)', type: 'text', placeholder: 'Defaults to you if left blank' },
  { key: 'verified_by_appointment', label: 'Verifying Appointment', type: 'text', placeholder: 'e.g. CO 123' }
];

const QUALIFICATION_FIELDS = [
  { key: 'qualification', label: 'Qualification', type: 'text' },
  { key: 'provider', label: 'Provider', type: 'text' },
  { key: 'date', label: 'Date Awarded', type: 'date' },
  { key: 'expiry', label: 'Expiry', type: 'date' },
  { key: 'sponsorship', label: 'Sponsorship', type: 'text' },
  { key: 'verification_status', label: 'Verification Status', type: 'select', options: ['Pending', 'Verified'] },
  { key: 'verified_by', label: 'Verified By (Supervisor)', type: 'text', placeholder: 'Defaults to you if left blank' },
  { key: 'verified_by_appointment', label: 'Verifying Appointment', type: 'text', placeholder: 'e.g. CO 123' }
];

// One control per recorded skill or qualification: key in, rectify or verify it.
// Verification records who signed it off and when, and the audit trail keeps the change.
export default function RecordVerification({ employee, item, index, kind = 'skill', onSaved, renderTrigger }) {
  const [open, setOpen] = useState(false);
  const isQualification = kind === 'qualification';
  const fields = isQualification ? QUALIFICATION_FIELDS : SKILL_FIELDS;
  const collection = isQualification ? 'qualifications' : 'skills';
  const process = isQualification ? 'Qualification Verification' : 'Skill Verification';
  const subject = isQualification ? item.qualification : item.skill;
  const verified = item.verification_status === 'Verified';

  const save = async (form, note) => {
    const me = await base44.auth.me().catch(() => null);
    const today = new Date().toISOString().slice(0, 10);
    const next = { ...item, ...form };
    if (!isQualification && form.proficiency) next.proficiency = Number(form.proficiency);
    if ((form.verification_status || item.verification_status) === 'Verified') {
      next.verification_status = 'Verified';
      next.verified_by = String(form.verified_by || '').trim() || item.verified_by || me?.full_name || '';
      next.verified_by_appointment = String(form.verified_by_appointment || '').trim() || item.verified_by_appointment || '';
      if (!isQualification) next.last_validated = form.last_validated || item.last_validated || today;
    }
    const audit = fields
      .filter(f => String(item[f.key] ?? '') !== String(next[f.key] ?? ''))
      .map(f => ({ process: `${process} — ${f.label}`, original_value: item[f.key], new_value: next[f.key] }));
    const saved = await recordReview({
      employee,
      patch: { [collection]: (employee[collection] || []).map((row, i) => (i === index ? next : row)) },
      process: `${process} — ${subject}`,
      audit,
      rationale: note,
      evidence: next.evidence
    });
    onSaved?.(saved);
  };

  return (
    <>
      {renderTrigger
        ? renderTrigger({ open: () => setOpen(true) })
        : (verified
          ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              title="Rectify this verification"
              className="text-left text-xs font-medium text-ready hover:underline"
            >
              Verified by {item.verified_by || '—'}{item.verified_by_appointment ? `, ${item.verified_by_appointment}` : ''}
            </button>
          )
          : <ReviewPill onClick={() => setOpen(true)} title="Key in, rectify or verify this record">Pending</ReviewPill>)}
      <EditFieldsDialog
        open={open}
        onOpenChange={setOpen}
        title={`${isQualification ? 'Qualification' : 'Skill'} Record — ${verified ? 'Rectify' : 'Verify'}`}
        description="Verification records who signed this off and when. Changes are kept in the audit trail; a supervisor's sign-off is not automatic proficiency."
        fields={fields}
        values={fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] == null ? '' : String(item[f.key]) }), {})}
        saveLabel="Save review"
        onSave={save}
      />
    </>
  );
}