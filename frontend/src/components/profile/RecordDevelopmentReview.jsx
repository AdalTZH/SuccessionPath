import React, { useState } from 'react';
import { StatusBadge } from '@/components/badges';
import EditFieldsDialog from '@/components/profile/EditFieldsDialog';
import { recordReview } from '@/lib/profileUpdates';

const FIELDS = [
  { key: 'gap', label: 'Gap', type: 'text' },
  { key: 'action', label: 'Agreed Action', type: 'text', placeholder: 'Course, intervention or supervised assignment' },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'due_date', label: 'Due', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Recorded', 'Agreed', 'In Progress', 'Completed'], help: 'Recorded = captured from the source workbook and not yet agreed by HR.' }
];

// HR keys in or rectifies a recorded development action. Course completion stays evidence
// of development — it is never recorded as automatic proficiency.
export default function RecordDevelopmentReview({ employee, item, index, onSaved, renderTrigger }) {
  const [open, setOpen] = useState(false);

  const save = async (form, note) => {
    const next = { ...item, ...form };
    const audit = FIELDS
      .filter(f => String(item[f.key] ?? '') !== String(next[f.key] ?? ''))
      .map(f => ({ process: `Development Action — ${f.label}`, original_value: item[f.key], new_value: next[f.key] }));
    const saved = await recordReview({
      employee,
      patch: { development: (employee.development || []).map((row, i) => (i === index ? next : row)) },
      process: `Development Action Review — ${item.gap}`,
      audit,
      rationale: note
    });
    onSaved?.(saved);
  };

  return (
    <>
      {renderTrigger
        ? renderTrigger({ open: () => setOpen(true) })
        : <StatusBadge status={item.status} onClick={() => setOpen(true)} title="Key in or rectify this development action" />}
      <EditFieldsDialog
        open={open}
        onOpenChange={setOpen}
        title="Development Action — Record Review"
        description="Development is agreed with the individual. Recording an action does not change their assessed proficiency."
        fields={FIELDS}
        values={FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] == null ? '' : String(item[f.key]) }), {})}
        saveLabel="Save development review"
        onSave={save}
      />
    </>
  );
}