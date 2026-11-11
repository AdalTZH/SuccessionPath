import React, { useMemo, useState } from 'react';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { useFilters, matchesFilters } from '@/lib/FilterContext';
import { PROFICIENCY } from '@/lib/postingEngine';
import { MonoValue, SectionLabel, AIPill } from '@/components/badges';
import { base44 } from '@/api/base44Client';
import { Search, Plus, X } from 'lucide-react';

const SKILL_CATEGORIES = ['Staff', 'Command', 'Aviation', 'Engineering', 'Operations', 'Training', 'Leadership', 'Technical', 'Other'];

export default function Skills() {
  const { skills, employees, appointments, loading, refresh } = useWorkbenchData();
  const filters = useFilters();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    skill_name: '', skill_category: 'Staff', description: '',
    proficiency_scale: '1 – Awareness, 2 – Working, 3 – Proficient, 4 – Advanced, 5 – Expert',
    related_appointments: '', related_courses: ''
  });

  const handleCreate = async () => {
    if (!form.skill_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        skill_name: form.skill_name.trim(),
        skill_category: form.skill_category,
        description: form.description.trim(),
        proficiency_scale: form.proficiency_scale,
        related_appointments: form.related_appointments ? form.related_appointments.split(',').map(s => s.trim()).filter(Boolean) : [],
        related_courses: form.related_courses ? form.related_courses.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const created = await base44.entities.Skill.create(payload);
      await refresh();
      setSelected(created);
      setShowAdd(false);
      setForm({ skill_name: '', skill_category: 'Staff', description: '', proficiency_scale: '1 – Awareness, 2 – Working, 3 – Proficient, 4 – Advanced, 5 – Expert', related_appointments: '', related_courses: '' });
    } catch (e) {
      alert('Failed to create skill: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => employees.filter(e => matchesFilters(e, filters)), [employees, filters]);

  const rows = useMemo(() => skills.filter(s =>
    !query || `${s.skill_name} ${s.skill_category || ''}`.toLowerCase().includes(query.toLowerCase())
  ), [skills, query]);

  // For selected skill, show gap analysis across population
  const gapAnalysis = useMemo(() => {
    if (!selected) return [];
    return filteredEmployees.map(e => {
      const ps = (e.skills || []).find(s => s.skill === selected.skill_name);
      return {
        name: e.name,
        employee_id: e.employee_id,
        current: ps?.proficiency || 0,
        evidence: ps?.evidence || 'No evidence recorded',
        last_validated: ps?.last_validated || '—',
        verification: ps?.verification_status || '—',
        verified_by: ps?.verified_by || '—',
        verified_by_appointment: ps?.verified_by_appointment || '—'
      };
    }).sort((a, b) => b.current - a.current);
  }, [selected, filteredEmployees]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Skills Library</h1>
          <p className="text-sm text-muted-foreground">Skills taxonomy with proficiency levels and gap analysis across the population.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search skill, category…"
              className="w-72 rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Skill
          </button>
        </div>
      </div>

      {/* Add Skill dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="mx-4 w-full max-w-lg rounded-sm border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Add New Skill</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Type in the skill details. This becomes part of the skills taxonomy and can be linked to appointments and courses.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Skill Name *</label>
                <input
                  value={form.skill_name}
                  onChange={e => setForm(f => ({ ...f, skill_name: e.target.value }))}
                  placeholder="e.g. Strategic & Systems Thinking"
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                <select
                  value={form.skill_category}
                  onChange={e => setForm(f => ({ ...f, skill_category: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Why this skill matters, what it covers…"
                  rows={2}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Proficiency Scale</label>
                <input
                  value={form.proficiency_scale}
                  onChange={e => setForm(f => ({ ...f, proficiency_scale: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Related Appointments</label>
                  <input
                    value={form.related_appointments}
                    onChange={e => setForm(f => ({ ...f, related_appointments: e.target.value }))}
                    placeholder="Comma-separated"
                    className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Related Courses</label>
                  <input
                    value={form.related_courses}
                    onChange={e => setForm(f => ({ ...f, related_courses: e.target.value }))}
                    placeholder="Comma-separated"
                    className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!form.skill_name.trim() || saving}
                className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create Skill'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Skills list */}
        <div className="lg:col-span-4">
          <div className="overflow-hidden rounded-sm border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold text-foreground">Skills ({rows.length})</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {rows.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`block w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary ${selected?.id === s.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{s.skill_name}</span>
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">{s.skill_category || '—'}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.description || '—'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gap analysis */}
        <div className="lg:col-span-8">
          {selected ? (
            <div className="rounded-sm border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selected.skill_name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.description || '—'}</p>
                </div>
                <AIPill />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-3">
                <div><SectionLabel>Category</SectionLabel><p className="mt-0.5 text-sm text-foreground">{selected.skill_category || '—'}</p></div>
                <div><SectionLabel>Scale</SectionLabel><p className="mt-0.5 text-sm text-foreground">{selected.proficiency_scale || '1–5'}</p></div>
                <div><SectionLabel>Related Courses</SectionLabel><p className="mt-0.5 text-sm text-foreground">{(selected.related_courses || []).join(', ') || '—'}</p></div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Population Proficiency — Gap Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual</th>
                        <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Current</th>
                        <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                        <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</th>
                        <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Last Validated</th>
                        <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gapAnalysis.map(g => {
                        const levelCls = g.current >= 4 ? 'text-ready' : g.current >= 3 ? 'text-foreground' : g.current > 0 ? 'text-review' : 'text-muted-foreground';
                        return (
                          <tr key={g.employee_id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">{g.name}</td>
                            <td className="py-2 pr-4"><MonoValue className={levelCls}>{g.current || '—'}</MonoValue></td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">{PROFICIENCY[g.current] || '—'}</td>
                            <td className="py-2 pr-4 text-xs text-foreground">{g.evidence}</td>
                            <td className="py-2 pr-4"><MonoValue>{g.last_validated}</MonoValue></td>
                            <td className="py-2 text-xs">{g.verification === 'Verified' ? <span className="font-medium text-ready">Verified by {g.verified_by}{g.verified_by_appointment && g.verified_by_appointment !== '—' ? `, ${g.verified_by_appointment}` : ''}</span> : g.current > 0 ? <span className="font-medium text-review">Pending</span> : <span className="text-muted-foreground">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-sm border border-border bg-card">
              <p className="text-sm text-muted-foreground">Select a skill to view population proficiency and gap analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}