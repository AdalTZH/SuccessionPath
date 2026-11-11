import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditFieldsDialog from '@/components/profile/EditFieldsDialog';
import { recordReview } from '@/lib/profileUpdates';

const NOT_RECORDED = 'Not recorded';

const FIELDS = [
  { key: 'availability', label: 'Availability Status', type: 'select', options: ['Available Now', 'Available Soon', 'Not Available', NOT_RECORDED] },
  { key: 'earliest_posting_date', label: 'Earliest Posting Date', type: 'date' },
  { key: 'current_tour_end_date', label: 'Appointment / Tour End', type: 'date', help: 'The date the current appointment is expected to end — a planning trigger, not approval of a posting.' },
  { key: 'posting_restrictions', label: 'Posting Restrictions', type: 'text', placeholder: 'Separate multiple restrictions with a comma', help: 'Recorded restrictions are constraints for HR to assess, never automatic exclusions.' }
];

// HR keys in or rectifies posting availability — the item flagged as missing on the dashboard.
export default function PostingAvailabilityEditor({ employee, onSaved, renderTrigger, buttonLabel = 'Key in / rectify posting availability' }) {
  const [open, setOpen] = useState(false);
  const current = employee?.posting_availability || {};
  const values = {
    availability: current.availability || NOT_RECORDED,
    earliest_posting_date: current.earliest_posting_date || '',
    current_tour_end_date: current.current_tour_end_date || '',
    posting_restrictions: (current.posting_restrictions || []).join(', ')
  };

  const save = async (form, note) => {
    const next = {
      ...current,
      availability: form.availability === NOT_RECORDED ? '' : (form.availability || ''),
      earliest_posting_date: form.earliest_posting_date || '',
      current_tour_end_date: form.current_tour_end_date || '',
      posting_restrictions: String(form.posting_restrictions || '').split(',').map(s => s.trim()).filter(Boolean)
    };
    const audit = [
      { process: 'Posting Availability — Availability Status', original_value: current.availability || NOT_RECORDED, new_value: next.availability || NOT_RECORDED },
      { process: 'Posting Availability — Earliest Posting Date', original_value: current.earliest_posting_date, new_value: next.earliest_posting_date },
      { process: 'Posting Availability — Appointment / Tour End', original_value: current.current_tour_end_date, new_value: next.current_tour_end_date },
      { process: 'Posting Availability — Posting Restrictions', original_value: (current.posting_restrictions || []).join(', '), new_value: next.posting_restrictions.join(', ') }
    ];
    const saved = await recordReview({
      employee,
      patch: { posting_availability: next },
      process: 'Posting Availability Review',
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
        title="Posting Availability — Record Review"
        description="Availability is recorded from the individual's tour, not inferred. Saving writes the review to the audit trail."
        fields={FIELDS}
        values={values}
        saveLabel="Save availability review"
        onSave={save}
      />
    </>
  );
}