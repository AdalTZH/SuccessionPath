import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MonoValue, AIPill, ReviewPill } from '@/components/badges';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { tenureLabel, rowTenureMonths, confidenceLabel } from '@/lib/pathwayHistoryEngine';

// Predecessor & successor metrics for an appointment, read from the imported appointment history.
// Age and course metrics are not shown: the migrated source does not carry date of birth or course data.
export default function PredecessorKeyMetrics({ appointment, catalogueLabel }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const label = catalogueLabel || appointment?.catalogue_label;

  useEffect(() => {
    if (!label) { setRows([]); return; }
    let mounted = true;
    setLoading(true);
    base44.entities.AppointmentHistory
      .filter({ appointment: label }, { sort: '-start_date', limit: 300 })
      .then(page => { if (mounted) setRows(page.items || []); })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [label]);

  const holders = useMemo(
    () => [...rows].sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || ''))),
    [rows]
  );

  const header = (labelText, badge) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">{labelText}</span>
      {badge}
    </div>
  );

  if (!label) {
    return (
      <div className="mt-2.5 border-t border-border pt-2.5">
        {header('Predecessor Key Metrics', <ReviewPill>Unmapped</ReviewPill>)}
        <p className="mt-1 text-[0.625rem] text-muted-foreground">
          No validated mapping to an imported appointment label. Historical pathway metrics stay unavailable until HR maps this profile to the source catalogue.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="mt-2.5 border-t border-border pt-2.5 text-[0.625rem] text-muted-foreground">Loading recorded history…</div>;
  }

  if (!holders.length) {
    return (
      <div className="mt-2.5 border-t border-border pt-2.5">
        {header('Predecessor Key Metrics')}
        <p className="mt-1 text-[0.625rem] text-muted-foreground">No recorded holdings for “{label}” in the imported source.</p>
      </div>
    );
  }

  const distinct = new Set(holders.map(h => h.employee_id)).size;
  const currentCount = holders.filter(h => h.is_current).length;
  const tenures = holders.map(rowTenureMonths).filter(t => t != null);
  const median = tenures.length ? [...tenures].sort((a, b) => a - b)[Math.floor(tenures.length / 2)] : null;
  const conf = confidenceLabel(holders.length);

  return (
    <div className="mt-2.5 border-t border-border pt-2.5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-1.5">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        {header(`Predecessor Key Metrics (${distinct})`, <AIPill />)}
      </button>

      <p className="mt-1 text-[0.625rem] text-muted-foreground">
        <MonoValue>{holders.length}</MonoValue> recorded holdings · <MonoValue>{distinct}</MonoValue> personnel · <MonoValue>{currentCount}</MonoValue> current · median tenure <MonoValue>{tenureLabel(median)}</MonoValue> · {conf.text}
      </p>

      {expanded && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-3 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Personnel</th>
                <th className="py-1.5 pr-3 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                <th className="py-1.5 pr-3 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Period Held</th>
                <th className="py-1.5 pr-3 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="py-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {holders.slice(0, 25).map((h, i) => (
                <tr key={h.id || i} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-3">
                    <div className="font-medium text-foreground">{h.employee_name}</div>
                    <div className="font-mono text-[0.625rem] text-muted-foreground">{h.employee_id}</div>
                  </td>
                  <td className="py-1.5 pr-3"><MonoValue>{h.rank || '—'}</MonoValue></td>
                  <td className="py-1.5 pr-3 font-mono text-foreground">
                    {h.start_date || '—'} → {h.end_date || (h.is_open_ended ? 'Current' : '—')}
                  </td>
                  <td className="py-1.5 pr-3"><MonoValue>{tenureLabel(rowTenureMonths(h))}</MonoValue></td>
                  <td className="py-1.5">
                    {h.is_current
                      ? <span className="text-[0.625rem] font-medium text-ready">Current holder</span>
                      : <span className="text-[0.625rem] text-muted-foreground">Historical</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {holders.length > 25 && (
            <p className="mt-1.5 text-[0.625rem] text-muted-foreground">Showing 25 of {holders.length} recorded holdings.</p>
          )}
          <p className="mt-1.5 text-[0.625rem] leading-tight text-muted-foreground">
            Metrics read directly from the imported appointment history. Age and course metrics are not shown — the migrated source does not carry date of birth or course data.
          </p>
        </div>
      )}
    </div>
  );
}