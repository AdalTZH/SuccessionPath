// Where a review item is keyed in or verified.
// Review indicators across the app link straight to the tab that holds the data being
// reviewed, so HR does not have to hunt through the profile tabs to find it.

export function tabForText(text) {
  const t = String(text || '').toLowerCase();
  if (/availab|posting|tour|appt end/.test(t)) return 'succession';
  if (/prefer|aspiration|interest|mobility/.test(t)) return 'aspirations';
  if (/assess|perform|potential|calibrat/.test(t)) return 'assessments';
  if (/develop|course|gap/.test(t)) return 'development';
  if (/skill|qualif|attribute|verif/.test(t)) return 'skills';
  return 'overview';
}

export const TAB_LABELS = {
  overview: 'Overview',
  history: 'Career History',
  skills: 'Skills & Attributes',
  assessments: 'Assessments',
  aspirations: 'Aspirations',
  development: 'Development',
  succession: 'Posting & Succession',
  ehr: 'eHR Data'
};

// The focus text names the exact item needing review, so the profile can say what the review is
// for instead of only which tab to open.
export function profileTabPath(employeeId, tab, focus) {
  const t = tab || 'overview';
  const f = String(focus || '').trim();
  return `/people/${employeeId}?tab=${t}${f ? `&focus=${encodeURIComponent(f)}` : ''}`;
}

// What stands between this person and a clean decision, written out from the match checks.
export function reviewFocus(result, fallback) {
  const reviews = (result?.checks || []).filter(c => c.status === 'review');
  const gaps = (result?.skillsGap || []).filter(g => g.gap > 0);
  const parts = [
    ...reviews.map(c => c.detail || c.criterion),
    ...(gaps.length > 0
      ? [`${gaps.length} skill gap${gaps.length === 1 ? '' : 's'}: ${gaps.slice(0, 3).map(g => `${g.skill} (${g.gap} level${g.gap === 1 ? '' : 's'} short)`).join(', ')}`]
      : [])
  ];
  return parts.filter(Boolean).join(' · ') || fallback || '';
}

// Statuses that still need HR to key in or verify something.
export function isReviewStatus(status) {
  return /Review|Required/.test(status || '');
}