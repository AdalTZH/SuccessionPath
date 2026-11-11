import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const FilterContext = createContext(null);

const ALL = 'All';

// Tag vocabulary. Person tags live on the personnel record; the rest are appointment tags
// (a P1/P2 grooming post, or the vocation an appointment is tied to).
export const TALENT_TAG = 'Talent (T1/T1+)';
export const WRANGLER_TAG = 'Wrangler';
export const GROOMING_P1_TAG = 'Grooming P1';
export const GROOMING_P2_TAG = 'Grooming P2';
const PERSON_TAGS = [TALENT_TAG, WRANGLER_TAG];
const GROOMING_TAGS = [GROOMING_P1_TAG, GROOMING_P2_TAG];

export function isPersonTag(tag) {
  return PERSON_TAGS.includes(tag);
}

function isGroomingTag(tag) {
  return GROOMING_TAGS.includes(tag);
}

export function FilterProvider({ children }) {
  const [vocation, setVocation] = useState(ALL);
  const [rank, setRank] = useState(ALL);
  const [org, setOrg] = useState(ALL);
  const [tag, setTag] = useState(ALL);

  // The population vocabulary is read from the source workbook — VOC (column D) and RANK —
  // together with the organisation held on the personnel records. Never a fixed sample list.
  const [vocations, setVocations] = useState([ALL]);
  const [ranks, setRanks] = useState([ALL]);
  const [orgs, setOrgs] = useState([ALL]);
  const [tags, setTags] = useState([ALL, ...PERSON_TAGS, ...GROOMING_TAGS]);

  useEffect(() => {
    let mounted = true;
    const withAll = values => [ALL, ...values.filter(Boolean).sort()];
    Promise.all([
      base44.entities.AppointmentHistoryRaw.list({ distinct: 'voc' }),
      base44.entities.AppointmentHistoryRaw.list({ distinct: 'rank' }),
      base44.entities.Employee.list({ distinct: 'organisation' }),
      base44.entities.AppointmentCatalogue.list({ distinct: 'speciality' }).catch(() => ({ items: [] }))
    ]).then(([vocRes, rankRes, orgRes, specRes]) => {
      if (!mounted) return;
      setVocations(withAll(vocRes.items || []));
      setRanks(withAll(rankRes.items || []));
      setOrgs(withAll(orgRes.items || []));
      // Specialities are shown exactly as recorded so they match the stored value.
      const specialities = (specRes.items || []).filter(Boolean).map(v => v.trim()).filter(Boolean).sort();
      setTags([ALL, ...PERSON_TAGS, ...GROOMING_TAGS, ...specialities]);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <FilterContext.Provider value={{
      vocation, setVocation, rank, setRank, org, setOrg, tag, setTag,
      vocations, ranks, orgs, tags
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}

// Applies the active global filters to a record with vocation/rank/organisation fields.
// Person tags (talent, wrangler) are applied here; appointment tags are applied by the caller
// through matchesAppointmentTag, since they depend on the appointment the person holds.
export function matchesFilters(record, filters) {
  if (!filters) return true;
  if (filters.vocation && filters.vocation !== 'All' && record.vocation != null && record.vocation !== filters.vocation) return false;
  if (filters.rank && filters.rank !== 'All' && record.rank != null && record.rank !== filters.rank) return false;
  if (filters.org && filters.org !== 'All' && record.organisation != null && record.organisation !== filters.org) return false;
  if (filters.tag === TALENT_TAG && !['T1', 'T1+'].includes(record.talent)) return false;
  if (filters.tag === WRANGLER_TAG && record.wrangler !== 'Y') return false;
  return true;
}

// Applies an appointment tag to a person through the appointment they currently hold.
// appointmentTagByLabel maps appointment label -> { tier, speciality }.
export function matchesAppointmentTag(record, tag, appointmentTagByLabel) {
  if (!tag || tag === 'All' || isPersonTag(tag)) return true;
  const entry = appointmentTagByLabel?.[record.current_appointment];
  if (!entry) return false;
  if (isGroomingTag(tag)) return entry.tier === tag.slice(-2);
  return entry.speciality === tag;
}

// Applies the active global filters to an Appointment record.
// Appointments use rank_requirement / vocation_requirement / organisation.
// "Any" or missing requirements pass any population filter (they accept everyone).
export function appointmentMatchesFilters(appt, filters) {
  if (!filters) return true;
  if (filters.vocation && filters.vocation !== 'All') {
    const vr = appt.vocation_requirement;
    const vrs = Array.isArray(vr) ? vr.filter(v => v && v !== 'Any') : (vr && vr !== 'Any' ? [vr] : []);
    if (vrs.length > 0 && !vrs.includes(filters.vocation)) return false;
  }
  if (filters.rank && filters.rank !== 'All') {
    const rr = appt.rank_requirement;
    if (rr && rr !== 'Any' && rr !== filters.rank) return false;
  }
  // Workbook-derived appointments carry no organisation of their own — blank is not a requirement.
  if (filters.org && filters.org !== 'All' && appt.organisation && appt.organisation !== filters.org) return false;
  return true;
}