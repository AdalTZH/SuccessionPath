import { Router } from 'express';
import { listRecords } from '../store.js';

// Port of the original AI Career Assistant.
// Deterministic rules supply the facts; the model explains them, it never decides.

const PROFICIENCY = { 1: 'Awareness', 2: 'Working', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

function serializeEmployee(e) {
  const skills = (e.skills || []).map(s => `${s.skill} (L${s.proficiency} ${PROFICIENCY[s.proficiency] || ''}, ${s.verification_status || 'unverified'})`).join('; ');
  const attributes = (e.attributes || []).map(a => `${a.attribute} (L${a.rating})`).join('; ');
  const quals = (e.qualifications || []).map(q => `${q.qualification} (${q.verification_status || 'unverified'})`).join('; ');
  const courses = (e.courses || []).map(c => `${c.course} (${c.status || 'completed'} ${c.completion_date || ''})`).join('; ');
  const avail = e.posting_availability || {};
  const asp = e.career_aspirations || {};
  const prefs = [asp.preferred_appointment_1, asp.preferred_appointment_2, asp.preferred_appointment_3].filter(Boolean).join(', ');
  return `EMPLOYEE: ${e.name} | ID: ${e.employee_id} | Rank: ${e.rank} | Vocation: ${e.vocation} | Org: ${e.organisation || ''} | Current Appt: ${e.current_appointment || ''} | Years in Service: ${e.years_in_service || '?'} | Available: ${avail.earliest_posting_date || 'not recorded'} | Restrictions: ${(avail.posting_restrictions || []).join(', ') || 'none'} | Skills: ${skills || 'none'} | Attributes: ${attributes || 'none'} | Qualifications: ${quals || 'none'} | Courses: ${courses || 'none'} | Aspirations: ${asp.interests || ''} | Preferred Appts: ${prefs || 'not expressed'} | Preferred Area: ${asp.preferred_career_area || ''} | Dev Interests: ${asp.development_interests || ''} | HR Tags: ${(e.hr_tags || []).join(', ') || 'none'}`;
}

function serializeAppointment(a) {
  const vocReqs = Array.isArray(a.vocation_requirement) ? a.vocation_requirement.join(', ') : (a.vocation_requirement || 'Any');
  const reqSkills = (a.required_skills || []).map(s => `${s.skill} (desired L${s.desired_proficiency || s.proficiency})`).join('; ');
  const mandQuals = (a.mandatory_qualifications || []).join(', ');
  const reqCourses = (a.required_courses || []).map(c => `${c.course} (${c.classification})`).join('; ');
  return `APPOINTMENT: ${a.title} | ID: ${a.appointment_id} | Org: ${a.organisation || ''} | Rank: ${a.rank_requirement} | Vocations: ${vocReqs} | Window: ${a.start_date} → ${a.end_date} | Mandatory Quals: ${mandQuals || 'none'} | Required Skills: ${reqSkills || 'none'} | Required Courses: ${reqCourses || 'none'} | Criticality: ${a.criticality || ''}`;
}

function serializeAssessment(a) {
  const strengths = (a.key_strengths || []).join(', ');
  const devAreas = (a.development_areas || []).join(', ');
  const attrs = (a.attributes_observed || []).map(at => `${at.attribute}: ${at.observation}`).join('; ');
  const skills = (a.skills_demonstrated || []).map(s => `${s.skill} (L${s.level})`).join('; ');
  return `ASSESSMENT ${a.assessment_period} | ${a.employee_name} (${a.employee_id}) | Supervisor: ${a.supervisor_name} (${a.supervisor_appointment || ''}) | Individual's Appt: ${a.individual_appointment || ''} | Overall: ${a.overall_assessment || ''} | Strengths: ${strengths} | Dev Areas: ${devAreas} | Attributes: ${attrs} | Skills: ${skills} | Recommendation: ${a.career_recommendation || ''} | Narrative: ${a.supervisor_narrative || ''} | Date: ${a.assessment_date}`;
}

function serializeSuccessionPlan(p) {
  return `SUCCESSION: ${p.appointment_title} (${p.appointment_id}) | Current Holder: ${p.current_holder_name || 'vacant'} | Primary: ${p.primary_successor_name || '—'} | Alt1: ${p.alternate1_name || '—'} | Alt2: ${p.alternate2_name || '—'} | Pipeline: ${(p.development_pipeline || []).join(', ') || '—'} | Depth: ${p.succession_depth}`;
}

function serializePostingAssignment(pa) {
  return `ASSIGNMENT: ${pa.appointment_title} (${pa.appointment_id}) | Primary: ${pa.primary_candidate_name || '—'} | Alt1: ${pa.alternate1_name || '—'} | Alt2: ${pa.alternate2_name || '—'} | Status: ${pa.status}`;
}

function buildLongitudinalSynthesis(assessments) {
  if (!assessments || assessments.length === 0) return 'No supervisor assessments recorded.';
  const sorted = [...assessments].sort((a, b) => (a.assessment_period || '').localeCompare(b.assessment_period || ''));
  const allStrengths = {};
  const allDevAreas = {};
  sorted.forEach(a => {
    (a.key_strengths || []).forEach(s => { allStrengths[s] = (allStrengths[s] || 0) + 1; });
    (a.development_areas || []).forEach(d => { allDevAreas[d] = (allDevAreas[d] || 0) + 1; });
  });
  const recurringStrengths = Object.entries(allStrengths).filter(([, c]) => c >= 2).map(([s]) => s);
  const recurringDevAreas = Object.entries(allDevAreas).filter(([, c]) => c >= 2).map(([d]) => d);
  const latest = sorted[sorted.length - 1];
  const previous = sorted.slice(0, -1);

  let synthesis = `Assessments across ${sorted.length} period(s): ${sorted.map(a => a.assessment_period).join(', ')}.\n`;
  if (recurringStrengths.length > 0) synthesis += `Recurring strengths (identified by 2+ supervisors): ${recurringStrengths.join(', ')}.\n`;
  if (recurringDevAreas.length > 0) synthesis += `Recurring development areas (identified by 2+ supervisors): ${recurringDevAreas.join(', ')}.\n`;

  if (previous.length > 0) {
    const latestStrengths = latest.key_strengths || [];
    const latestDevAreas = latest.development_areas || [];
    const newStrengths = latestStrengths.filter(s => !recurringStrengths.includes(s));
    const newConcerns = latestDevAreas.filter(d => recurringStrengths.includes(d));
    if (newStrengths.length > 0) synthesis += `Newly emerging strengths in latest assessment: ${newStrengths.join(', ')}.\n`;
    if (newConcerns.length > 0) synthesis += `CHANGE DETECTED: ${newConcerns.join(', ')} was historically a strength but is flagged as a development area in the latest assessment — may warrant HR review.\n`;
  }
  synthesis += `Latest assessment (${latest.assessment_period}): ${latest.overall_assessment || 'no overall summary'}.`;
  return synthesis;
}

async function list(entity, sort, limit) {
  const page = await listRecords(entity, { sort, limit });
  return page.items;
}

async function callModel(prompt) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    const error = new Error(
      'The AI assistant is not configured on this server. Set LLM_API_KEY (and optionally LLM_BASE_URL and LLM_MODEL) in the backend environment.'
    );
    error.status = 503;
    throw error;
  }

  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    const error = new Error(`Model call failed (${response.status}): ${detail}`);
    error.status = 502;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error('The model returned no answer');
    error.status = 502;
    throw error;
  }
  return typeof content === 'string' ? content : content.map(part => part.text || '').join('');
}

export async function careerAssistant(req, res, next) {
  try {
    const question = req.body?.question;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const employees = await list('Employee', '-created_date', 80);
    const appointments = await list('Appointment', '-created_date', 200);
    const supervisorAssessments = await list('SupervisorAssessment', '-created_date', 500);
    const successionPlans = await list('SuccessionPlan', '-created_date', 200);
    const postingAssignments = await list('PostingAssignment', '-created_date', 200);
    const pathwayRecords = await list('AppointmentPathway', '-total_holdings', 40);

    // Targeted lookup: personnel named in the question get their full appointment history.
    const idMatches = [...new Set((question.match(/\b(?:PER|EMP)\d+\b/gi) || []).map(s => s.toUpperCase()))];
    let targetedEmployees = [];
    let targetedHistory = [];
    if (idMatches.length > 0) {
      const or = idMatches.flatMap(id => [{ employee_id: id }, { name: id }]);
      targetedEmployees = (await listRecords('Employee', { query: { $or: or }, limit: 25 })).items;
      const ids = targetedEmployees.map(e => e.employee_id).filter(Boolean);
      if (ids.length > 0) {
        targetedHistory = (await listRecords('AppointmentHistory', { query: { employee_id: { $in: ids } }, sort: 'sequence', limit: 600 })).items;
      }
    }

    const employeeData = employees.map(serializeEmployee).join('\n');
    const appointmentData = appointments.map(serializeAppointment).join('\n');
    const assessmentData = supervisorAssessments.map(serializeAssessment).join('\n');
    const successionData = successionPlans.map(serializeSuccessionPlan).join('\n');
    const assignmentData = postingAssignments.map(serializePostingAssignment).join('\n');

    const targetedData = targetedEmployees.map(serializeEmployee).join('\n');
    const historyData = targetedHistory
      .map(h => `${h.employee_name} (${h.employee_id}) | ${h.appointment} | ${h.start_date} → ${h.is_open_ended ? 'Current / Ongoing' : (h.end_date || '?')} | ${h.duration_label || ''}${h.rank ? ' | ' + h.rank : ''}${h.vocation ? ' | ' + h.vocation : ''}`)
      .join('\n');
    const pathwayData = pathwayRecords
      .map(p => `PATHWAY: ${p.label} | holdings: ${p.total_holdings} | personnel: ${p.distinct_holders} | current holders: ${p.current_holders} | median tenure (months): ${p.median_tenure_months ?? '?'} | arrived from: ${(p.typical_predecessors || []).slice(0, 4).map(x => `${x.label} (${x.count})`).join(', ') || 'none recorded'} | moved on to: ${(p.typical_successors || []).slice(0, 4).map(x => `${x.label} (${x.count})`).join(', ') || 'none recorded'} | observed transitions: ${p.transition_sample_size}`)
      .join('\n');

    const syntheses = employees
      .map(e => {
        const empAssessments = supervisorAssessments.filter(a => a.employee_id === e.employee_id);
        if (empAssessments.length === 0) return null;
        return `${e.name} (${e.employee_id}) LONGITUDINAL SYNTHESIS:\n${buildLongitudinalSynthesis(empAssessments)}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const systemPrompt = `You are the AI Career Assistant for SuccessionPath, an HR Practitioner Career, Posting and Succession Planning Decision-Support System.

CORE DESIGN PRINCIPLE — The system distinguishes:
DATA → ELIGIBILITY → FEASIBILITY → SUITABILITY → READINESS → ASPIRATIONS/PREFERENCES → DEVELOPMENT → SUCCESSION IMPACT → CONFLICT/CONTINGENCY CHECK → HR REVIEW → HUMAN DECISION

Do not collapse these into one opaque score.

AI DOES NOT MAKE PERSONNEL DECISIONS. You may:
- Retrieve information and summarise career history
- Synthesise longitudinal supervisor assessments
- Explain why someone is suitable or was excluded
- Compare viable candidates
- Highlight recurring strengths and development areas
- Suggest development interventions
- Explain succession consequences and contingency scenarios

AI must NEVER:
- Invent missing personnel information
- Override mandatory rules
- Treat inferred information as verified fact
- Automatically confirm a posting
- Automatically replace a successor
- Automatically change approved succession plans

MATCHING HIERARCHY (use this to explain recommendations):
1. MANDATORY ELIGIBILITY — Rank, Vocation, Mandatory Qualifications, Mandatory Courses
2. POSTING FEASIBILITY — Availability window, posting restrictions
3. APPOINTMENT SUITABILITY — Required skills (desired, not mandatory), required tags
4. READINESS — Ready / Ready with Development / Longer-term Candidate / Review Required
5. CAREER ASPIRATION / PREFERENCE — Preferred appointments (one input, not entitlement)
6. DEVELOPMENT VALUE — Skill gaps that can be closed
7. ORGANISATIONAL / SUCCESSION CONSEQUENCE — Impact on other succession pipelines
8. HR JUDGEMENT — Final decision always with HR

ELIGIBILITY THRESHOLD: 60% of criteria must be satisfied for automatic eligibility. Below 60% = Excluded (HR override possible with justification).

SKILLS vs COURSES vs ASSESSMENTS:
- SKILL = demonstrated capability (proficiency 1-5)
- COURSE = development intervention (completion does NOT auto-increase skill proficiency)
- SUPERVISOR ASSESSMENT = evidence about behaviour over time (not auto-converted to facts)

LABELS to use: ELIGIBLE, NOT ELIGIBLE, READY, READY WITH DEVELOPMENT, LONGER-TERM CANDIDATE, REVIEW REQUIRED, POSTING CONFLICT, SUCCESSION CONFLICT, MISSING INFORMATION, HR REVIEW REQUIRED.

RULES:
- Only use information actually present in the data below.
- If information is unavailable, say "Information not available." Never fabricate.
- Clearly distinguish verified facts from AI synthesis.
- For posting recommendations, apply the matching hierarchy and explain each step.
- For succession questions, identify the succession chain and any competing demand or cascading impact.
- For contingency questions, identify all affected appointments and cascading consequences. Do NOT implement changes automatically.
- Keep responses structured and concise. Use the person's name and employee ID.
- If asked about a specific person, find them by name (case-insensitive partial match).
- An employee record NEVER contains inline appointment history. Appointment history for personnel named in the question is supplied in the TARGETED APPOINTMENT HISTORY section. Always check that section before stating that history is unavailable.
- HISTORICAL PATHWAY DATA is descriptive of the recorded population only. Always state the observed counts and sample size, never present a pattern as a rule, and never predict an individual's next appointment as fact.
- Where a pathway pattern rests on a small sample, say so explicitly before describing it.

=== DATA ===

TARGETED PERSONNEL (full records for personnel named in the question):
${targetedData || 'None requested.'}

TARGETED APPOINTMENT HISTORY (chronological, from the migrated source):
${historyData || 'None requested.'}

OBSERVED APPOINTMENT PATHWAYS (descriptive of the recorded population, with sample sizes):
${pathwayData || 'No pathway data.'}

EMPLOYEES (population sample — appointment history is NOT inline here):
${employeeData}

APPOINTMENTS:
${appointmentData}

SUPERVISOR ASSESSMENTS:
${assessmentData}

LONGITUDINAL ASSESSMENT SYNTHESES:
${syntheses || 'No assessments recorded.'}

SUCCESSION PLANS:
${successionData}

CURRENT POSTING ASSIGNMENTS:
${assignmentData}

=== END DATA ===

Answer the user's question using ONLY the data above. Apply the matching hierarchy for any posting or succession question. Explain your reasoning step by step. Distinguish verified facts from AI synthesis. If information is missing, say so explicitly.`;

    const answer = await callModel(`${systemPrompt}\n\nUSER QUESTION: ${question}`);
    res.json({ answer, question });
  } catch (error) {
    next(error);
  }
}

const router = Router();
router.post('/careerAssistant', careerAssistant);
router.post('/:name', (req, res, next) => {
  if (req.params.name === 'careerAssistant') return careerAssistant(req, res, next);
  res.status(404).json({ error: `Unknown function: ${req.params.name}` });
});

export default router;