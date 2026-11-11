import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditFieldsDialog from '@/components/profile/EditFieldsDialog';
import { recordReview, todayISO } from '@/lib/profileUpdates';

const FIELDS = [
  { key: 'interests', label: 'Career Aspiration', type: 'textarea', rows: 3, placeholder: 'As expressed by the individual' },
  { key: 'preferred_career_area', label: 'Preferred Career / Functional Area', type: 'text' },
  { key: 'preferred_appointment_1', label: 'Preferred Future Appointment 1', type: 'text' },
  { key: 'preferred_appointment_2', label: 'Preferred Future Appointment 2', type: 'text' },
  { key: 'preferred_appointment_3', label: 'Preferred Future Appointment 3', type: 'text' },
  { key: 'development_interests', label: 'Development Interests', type: 'textarea', rows: 2 },
  { key: 'mobility_considerations', label: 'Mobility / Posting Considerations', type: 'textarea', rows: 2 }
];

// HR keys in or rectifies the individual's aspirations. Every changed field is written to
// the audit trail with the HR note, so aspiration stays a recorded input, not an assumption.
export default function AspirationEditor({ employee, onSaved, renderTrigger, buttonLabel = 'Key in / rectify aspirations' }) {
  const [open, setOpen] = useState(false);
  const current = employee?.career_aspirations || {};
  const values = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: current[f.key] || '' }), {});

  const save = async (form, note) => {
    const next = { ...current, ...form, last_updated: todayISO() };
    const audit = FIELDS
      .filter(f => String(current[f.key] ?? '') !== String(form[f.key] ?? ''))
      .map(f => ({ process: `Career Aspiration — ${f.label}`, original_value: current[f.key], new_value: form[f.key] }));
    const saved = await recordReview({
      employee,
      patch: { career_aspirations: next },
      process: 'Career Aspiration Review',
      audit,
      rationale: note
    });
    onSaved?.(saved);
  };

  return (
    <>
      {renderTrigger
        ? renderTrigger({ open: () => setOpen(true) })
        : (
          <Button size="sm" variant="outline" className="h-7 rounded-sm text-xs" onClick={() => setOpen(true)}>
            <Pencil className="mr-1 h-3 w-3" /> {buttonLabel}
          </Button>
        )}
      <EditFieldsDialog
        open={open}
        onOpenChange={setOpen}
        title="Career Aspirations — Record Review"
        description="Employee voice. Preference is one input to posting decisions, not entitlement, and it does not guarantee assignment."
        fields={FIELDS}
        values={values}
        saveLabel="Save aspiration review"
        onSave={save}
      />
    </>
  );
}