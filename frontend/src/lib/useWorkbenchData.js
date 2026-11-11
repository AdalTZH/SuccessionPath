import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// The workbook's appointment column is the appointment dimension for every tab.
// Catalogue entries are normalised into the appointment shape the matching engines expect.
// The workbook records no requirement columns, so those are left empty rather than invented.
export function toWorkbookAppointment(entry) {
  return {
    id: entry.id,
    appointment_id: entry.label,
    title: entry.label,
    organisation: '',
    usage_count: entry.usage_count || 0,
    distinct_employees: entry.distinct_employees || 0,
    current_holders: entry.current_holders || 0,
    group: entry.group || '',
    grooming_tier: entry.grooming_tier || '',
    speciality: entry.speciality || '',
    validation_status: entry.validation_status || 'Unvalidated',
    rank_requirement: 'Any',
    vocation_requirement: [],
    mandatory_qualifications: [],
    required_courses: [],
    required_tags: [],
    required_skills: [],
    required_experience: '',
    preferred_experience: '',
    criticality: '',
    vacancy_status: '',
    catalogue_derived: true
  };
}

// Loads the core workbench datasets once and shares them across pages.
export function useWorkbenchData() {
  const [data, setData] = useState({
    employees: [], appointments: [], courses: [], skills: [],
    postingAssignments: [], developmentPlans: [], actions: [], auditRecords: [],
    supervisorAssessments: [], successionPlans: []
  });
  const [loading, setLoading] = useState(true);

  const load = () => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      base44.entities.Employee.list('-created_date', 1500),
      base44.entities.AppointmentCatalogue.list('-usage_count', 2500),
      base44.entities.Course.list('-created_date', 100),
      base44.entities.Skill.list('-created_date', 100),
      base44.entities.PostingAssignment.list('-created_date', 200),
      base44.entities.DevelopmentPlan.list('-created_date', 200),
      base44.entities.Action.list('-created_date', 200),
      base44.entities.AuditRecord.list('-created_date', 200),
      base44.entities.SupervisorAssessment.list('-created_date', 500),
      base44.entities.SuccessionPlan.list('-created_date', 200)
    ]).then(([employees, catalogue, courses, skills, postingAssignments, developmentPlans, actions, auditRecords, supervisorAssessments, successionPlans]) => {
      if (!mounted) return;
      setData({
        // Legacy sample personnel are archived on migration — never selectable in active workflows.
        employees: employees.filter(e => !e.archived && !e.is_legacy_proxy),
        appointments: (catalogue || []).map(toWorkbookAppointment),
        courses, skills, postingAssignments, developmentPlans, actions, auditRecords, supervisorAssessments, successionPlans
      });
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  };

  useEffect(() => load(), []);

  return { ...data, loading, refresh: load };
}