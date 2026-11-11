import React from 'react';
import { SectionLabel, MonoValue } from '@/components/badges';

// eHR Data Tab — displays the raw eHR extract fields.
// Year-specific fields (PERF, YIR, AGE, ASSMT) are editable strings.

const FIELD_GROUPS = [
  {
    label: 'Identity & Posting',
    fields: [
      ['pernr', 'PERNR'], ['nric', 'NRIC'], ['callsign', 'CALLSIGN'],
      ['rank_grade', 'RANK GRADE'], ['complete_name', 'COMPLETE NAME'], ['rank_name', 'RANK/NAME'],
      ['voc', 'VOC'], ['appt', 'APPT'], ['unit', 'UNIT'], ['fmn', 'FMN'],
      ['full_appt', 'FULL APPT'], ['appt_tag', 'APPT TAG'],
      ['position_id', 'POSITION ID'], ['erank', 'ERANK'], ['evoc', 'EVOC'],
      ['pa', 'PA'], ['tos', 'TOS']
    ]
  },
  {
    label: 'Subunit Hierarchy',
    fields: [
      ['subunit_7', 'SUBUNIT-7'], ['subunit_6', 'SUBUNIT-6'], ['subunit_5', 'SUBUNIT-5'],
      ['subunit_4_appt', 'SUBUNIT 4 APPT'], ['subunit_3_appt', 'SUBUNIT 3 APPT'],
      ['subunit_2_appt', 'SUBUNIT 2 APPT'], ['subunit_1_appt', 'SUBUNIT 1 APPT']
    ]
  },
  {
    label: 'Key Dates',
    fields: [
      ['date_to_appt', 'DATE TO APPT'], ['date_unit', 'DATE UNIT'],
      ['date_rank', 'DATE RANK'], ['date_voc', 'DATE VOC'],
      ['hire_date', 'HIRE DATE'], ['compl_date', 'COMPL DATE'], ['dob', 'DOB']
    ]
  },
  {
    label: 'Personal',
    fields: [
      ['gender', 'GENDER'], ['city_of_birth', 'CITY OF BIRTH'], ['nationality', 'NATIONALITY'],
      ['ic_status', 'IC STATUS'], ['blood_group', 'BLOOD GROUP'], ['race', 'RACE'],
      ['mar_st', 'MAR ST'], ['religion', 'RELIGION']
    ]
  },
  {
    label: 'Medical & Fitness',
    fields: [
      ['pes', 'PES'], ['bmi', 'BMI'], ['ippt_award', 'IPPT AWARD'],
      ['ippt_date', 'IPPT DATE'], ['bmi_date', 'BMI DATE'], ['hsp', 'HSP']
    ]
  },
  {
    label: 'Languages & Specialisation',
    fields: [
      ['lang_spoken', 'LANG SPOKEN'], ['lang_written', 'LANG WRITTEN'],
      ['ac', 'A/C'], ['spec', 'SPEC'], ['spec_2', 'SPEC 2'], ['ep_ip', 'EP/IP']
    ]
  },
  {
    label: 'Operations & Instructor Categories',
    fields: [
      ['highest_ops_cat', 'Highest OPS CAT'], ['highest_ops_cat_dte', 'Highest OPS CAT Dte'],
      ['instr_cat', 'INSTR CAT'], ['instr_cat_date', 'INSTR CAT Date'],
      ['cat_ocu', 'CAT OCU'], ['cat_d', "CAT 'D'"], ['cat_c', "CAT 'C'"], ['cat_b', "CAT 'B'"], ['cat_a', "CAT 'A'"],
      ['conex_td', 'CONEX/TD']
    ]
  },
  {
    label: 'Performance & Potential (Year-Specific — Editable)',
    fields: [
      ['perf_2026', 'PERF2026'], ['ccep', 'CCEP'], ['scep', 'SCEP'], ['hcep', 'HCEP'],
      ['yir_26', 'YIR26'], ['age_26', 'AGE26'],
      ['assmt_2026', 'ASSMT2026'], ['assmt_2025', 'ASSMT2025'], ['assmt_2024', 'ASSMT2024'],
      ['assmt_2023', 'ASSMT2023'], ['assmt_2022', 'ASSMT2022'], ['assmt_2021', 'ASSMT2021'],
      ['assmt_2020', 'ASSMT2020'], ['assmt_2019', 'ASSMT2019'], ['assmt_2018', 'ASSMT2018'],
      ['assmt_2017', 'ASSMT2017'], ['assmt_2016', 'ASSMT2016'], ['assmt_2015', 'ASSMT2015'],
      ['assmt_2014', 'ASSMT2014'], ['assmt_2013', 'ASSMT2013']
    ]
  },
  {
    label: 'Talent & Scholarships',
    fields: [
      ['scholarship', 'SCHOLARSHIP'], ['talent', 'TALENT'], ['wrangler', 'WRANGLER'],
      ['csc', 'CSC'], ['csc_results', 'CSC RESULTS'],
      ['pcib', 'PCIB'], ['pcib_date', 'PCIB DATE'],
      ['co_tour', 'CO Tour'], ['ocib', 'OCIB'], ['ocib_date', 'OCIB DATE'], ['oc_tour', 'OC TOUR']
    ]
  },
  {
    label: 'Courses & Qualifications',
    fields: [
      ['bwc', 'BWC'], ['rwc', 'RWC'], ['fwc', 'FWC'],
      ['wso_cse', 'WSO CSE'], ['wpn_cse', 'WPN CSE'],
      ['bmtac', 'BMTAC'], ['jiec', 'JIEC'], ['aioc', 'AIOC'], ['bioc', 'BIOC'],
      ['jisc', 'JISC'], ['jissc', 'JISSC'],
      ['tswc_jwc', 'TSWC/JWC'], ['twsc_jwc_grade', 'TWSC/JWC Grade'],
      ['afac', 'AFAC'], ['afac_grade', 'AFAC Grade'],
      ['ew_course', 'EW COURSE (pre-2018 / 2018 syllabus)'],
      ['nfl', 'NFL'], ['aworb_usrb', 'AWORB/USRB']
    ]
  },
  {
    label: 'Posting & Notes',
    fields: [
      ['posting_plan', 'POSTING PLAN'], ['posting_pref', 'POSTING PREF'], ['notes', 'Notes']
    ]
  }
];

export default function EhrDataTab({ employee }) {
  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
        Raw eHR data extract fields. Year-specific fields (PERF, YIR, AGE, ASSMT) are editable — update field values when the year changes (e.g. when 2027 comes, add PERF2027 values).
      </div>
      {FIELD_GROUPS.map((group, gi) => (
        <div key={gi} className="rounded-sm border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{group.label}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {group.fields.map(([key, label]) => {
              const val = employee[key];
              const isDate = key.includes('date') || key === 'dob' || key === 'hire_date' || key === 'compl_date';
              return (
                <div key={key}>
                  <SectionLabel>{label}</SectionLabel>
                  <div className="mt-0.5 text-sm text-foreground">
                    {val !== undefined && val !== null && val !== '' ? (
                      <MonoValue>{isDate && val ? new Date(val).toLocaleDateString('en-GB') : String(val)}</MonoValue>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}