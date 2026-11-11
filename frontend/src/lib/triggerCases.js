// Trigger cases raised from the planning workbook.
// APPT END is the planning trigger date for a case — it is never confirmation that a
// posting or succession decision has been approved. HR confirms every outcome.

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function deadlineLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d == null) return 'trigger date not recorded';
  if (d < 0) return `${Math.abs(d)} day(s) past the trigger date`;
  if (d === 0) return 'trigger date is today';
  return `${d} day(s) to the trigger date`;
}

// Case records persisted in the Action entity become queue rows on the Home dashboard
// and in the Actions module, carrying the links HR needs to act on them.
export function caseActionRows(actions) {
  return (actions || []).filter(a => a.case_type).map(a => {
    const isSuccession = a.case_type === 'Succession';
    const id = a.individual_id ? encodeURIComponent(a.individual_id) : null;
    const label = a.appointment ? encodeURIComponent(a.appointment) : null;
    return {
      id: a.id,
      source: 'case',
      caseType: a.case_type,
      priority: a.priority || 'Medium',
      individual: a.individual || a.individual_id || '—',
      individualId: a.individual_id || null,
      appointment: a.appointment || '',
      triggerDate: a.trigger_date || a.due_date || null,
      issue: isSuccession ? 'Succession case — appointment to be vacated' : 'Posting case — end of appointment approaching',
      detail: `${a.appointment ? `Vacates “${a.appointment}” · ` : ''}APPT END ${a.trigger_date || '—'} · ${deadlineLabel(a.trigger_date)} · planning trigger only, not approval`,
      module: a.module || (isSuccession ? 'Succession' : 'Posting'),
      status: a.status || 'Open',
      // Review opens the surface that identifies candidates for this case: succession cases
      // open the vacated appointment's shortlist, posting cases open the individual's own matcher.
      reviewPath: isSuccession
        ? (label ? `/posting-workbench?appt=${label}` : '/posting-workbench')
        : (id ? `/posting-workbench?employee=${id}` : '/posting-workbench'),
      pathwayPath: id ? `/pathway-explorer?employee=${id}` : null,
      impactPath: label ? `/pathways?view=impact&appt=${label}${id ? `&person=${id}` : ''}` : null
    };
  });
}

// Conflicts and cascades the recorded data already supports. Nothing is inferred:
// each signal points at a value held on the individual or on a planned record.
export function caseSignals(caseRow, { actions, employees, successionPlans, postingAssignments }) {
  const out = [];
  const emp = (employees || []).find(e => e.employee_id === caseRow.individualId);
  if (!emp) return out;

  // More than one individual recorded as leaving the same appointment.
  const sharers = (actions || []).filter(a =>
    a.case_type === 'Succession' &&
    a.appointment === caseRow.appointment &&
    a.individual_id &&
    a.individual_id !== caseRow.individualId
  );
  if (sharers.length > 0) {
    out.push(`Shared vacancy — ${sharers.length} other individual(s) are recorded as leaving “${caseRow.appointment}”.`);
  }

  // Recorded availability falling after the appointment is expected to end.
  const from = emp.posting_available_from || emp.posting_availability?.earliest_posting_date;
  if (from && caseRow.triggerDate && from > caseRow.triggerDate) {
    out.push(`Availability conflict — recorded available from ${from}, but the appointment is expected to end ${caseRow.triggerDate}.`);
  }

  // Already named against other planned postings.
  (postingAssignments || [])
    .filter(pa => [pa.primary_candidate_id, pa.alternate1_id, pa.alternate2_id].includes(emp.employee_id) && pa.appointment_id !== caseRow.appointment)
    .forEach(pa => out.push(`Planned posting conflict — already named against “${pa.appointment_title || pa.appointment_id}” (${pa.status}).`));

  // Already carrying succession coverage elsewhere.
  (successionPlans || [])
    .filter(p => [p.primary_successor_id, p.alternate1_id, p.alternate2_id].includes(emp.employee_id) && p.appointment_id !== caseRow.appointment)
    .forEach(p => out.push(`Succession conflict — named as a successor for “${p.appointment_title || p.appointment_id}”; moving this individual reduces that coverage.`));

  // Development the replacement pipeline must close, as recorded against the individual.
  const gaps = (emp.development || []).filter(d => d.gap);
  if (caseRow.caseType === 'Posting' && gaps.length > 0) {
    out.push(`Recorded development requirements — ${gaps.map(g => `${g.gap}${g.gap_size ? ` (${g.gap_size})` : ''}`).join(', ')}.`);
  }

  return out;
}