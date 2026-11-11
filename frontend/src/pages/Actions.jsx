import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbenchData } from '@/lib/useWorkbenchData';
import { buildPostingActionQueue, getReviewPath } from '@/lib/workbench';
import { caseActionRows, caseSignals } from '@/lib/triggerCases';
import { isReviewStatus } from '@/lib/reviewTabs';
import CaseLinks from '@/components/actions/CaseLinks';
import { PriorityBadge, StatusBadge, MonoValue } from '@/components/badges';
import { ChevronRight } from 'lucide-react';

const MODULES = ['All', 'Posting', 'Succession', 'Conflict', 'Data', 'Development'];
const PRIORITIES = ['All', 'High', 'Medium', 'Low'];

export default function Actions() {
  const { actions, postingAssignments, successionPlans, employees, loading } = useWorkbenchData();
  const navigate = useNavigate();
  const [module, setModule] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');

  // Merge entity Action records with derived posting action queue
  const queue = useMemo(() => {
    const derived = buildPostingActionQueue(postingAssignments, employees);
    const cases = caseActionRows(actions);
    const fromActions = actions.filter(a => !a.case_type).map(a => ({
      id: a.id,
      priority: a.priority || 'Medium',
      individual: a.individual || '—',
      individualId: null,
      issue: a.action,
      detail: `Owner: ${a.owner || '—'} · Due: ${a.due_date || '—'}`,
      module: a.module || 'Posting',
      status: a.status,
      source: 'action'
    }));
    return [...derived, ...cases, ...fromActions];
  }, [actions, postingAssignments, employees]);

  // Conflicts and cascades detected on each trigger case from the records already held.
  const signalsById = useMemo(() => {
    const out = {};
    queue.filter(r => r.source === 'case').forEach(r => {
      out[r.id] = caseSignals(r, { actions, employees, successionPlans, postingAssignments });
    });
    return out;
  }, [queue, actions, employees, successionPlans, postingAssignments]);

  const filtered = useMemo(() => queue.filter(r =>
    (module === 'All' || r.module === module) &&
    (priority === 'All' || r.priority === priority) &&
    (status === 'All' || r.status === status)
  ).sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  }), [queue, module, priority, status]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">Actions</h1>
        <p className="text-sm text-muted-foreground">Central queue of posting conflicts, data gaps, and development actions requiring HR attention.</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select value={module} onChange={e => setModule(e.target.value)} className="rounded-sm border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground">
          {MODULES.map(o => <option key={o} value={o}>Module: {o}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-sm border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground">
          {PRIORITIES.map(o => <option key={o} value={o}>Priority: {o}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-sm border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground">
          {['All', 'Open', 'In Progress', 'Completed', 'Action Required', 'Review Required', 'Replacement Required'].map(o => <option key={o} value={o}>Status: {o}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left">
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Individual / Case</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Issue</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Module</th>
              <th className="px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No actions match the current filters.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-2.5"><PriorityBadge priority={r.priority} /></td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{r.individual}</div>
                  {r.individualId && <div className="font-mono text-[0.6875rem] text-muted-foreground">{r.individualId}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-foreground">{r.issue}</div>
                  {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                  {(signalsById[r.id] || []).map((s, i) => (
                    <div key={i} className="mt-1 text-xs font-medium text-review">{s}</div>
                  ))}
                </td>
                <td className="px-4 py-2.5"><span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-foreground">{r.module}</span></td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    status={r.status}
                    title={isReviewStatus(r.status) ? 'Open the tab where this review is recorded' : undefined}
                    onClick={isReviewStatus(r.status) ? () => navigate(r.reviewPath || getReviewPath(r)) : undefined}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <CaseLinks row={r} />
                    <button
                      onClick={() => navigate(r.reviewPath || getReviewPath(r))}
                      className="inline-flex items-center gap-0.5 rounded-sm bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Review <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{filtered.length} of {queue.length} actions shown</p>
    </div>
  );
}