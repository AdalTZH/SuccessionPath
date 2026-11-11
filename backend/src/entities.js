// Every entity name the frontend may address. Kept explicit so a typo or an
// unknown table is rejected instead of silently creating an empty collection.
export const ENTITIES = [
  'Action',
  'Appointment',
  'AppointmentCatalogue',
  'AppointmentHistory',
  'AppointmentHistoryRaw',
  'AppointmentPathway',
  'Assessment',
  'AuditRecord',
  'CalibrationSession',
  'Course',
  'DevelopmentPlan',
  'Employee',
  'PostingAssignment',
  'Skill',
  'SuccessionPlan',
  'SupervisorAssessment',
];

const LOOKUP = new Map(ENTITIES.map(name => [name.toLowerCase(), name]));

export function assertEntity(name) {
  const resolved = LOOKUP.get(String(name || '').toLowerCase());
  if (!resolved) {
    const error = new Error(`Unknown entity: ${name}`);
    error.status = 404;
    throw error;
  }
  return resolved;
}