import React from 'react';
import { MonoValue, SectionLabel, StatusBadge } from '@/components/badges';
import { tenureLabel, rowTenureMonths, confidenceLabel, ageAtDate } from '@/lib/pathwayHistoryEngine';

export default function AppointmentHoldersPanel({ pathway, holders = [], dobByEmployee }) {
  const conf = confidenceLabel(pathway?.transition_sample_size);
  const observed = [...holders].sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <SectionLabel>Recorded Holdings</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{pathway?.total_holdings ?? holders.length}</MonoValue></div>
        </div>
        <div>
          <SectionLabel>Distinct Personnel</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{pathway?.distinct_holders ?? '—'}</MonoValue></div>
        </div>
        <div>
          <SectionLabel>Current Holders</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{pathway?.current_holders ?? '—'}</MonoValue></div>
        </div>
        <div>
          <SectionLabel>Median Tenure</SectionLabel>
          <div className="mt-0.5 text-sm"><MonoValue>{tenureLabel(pathway?.median_tenure_months)}</MonoValue></div>
        </div>
      </div>

      {pathway && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2">
          <StatusBadge status={conf.tone === 'strong' ? 'Ready' : 'Review Required'} />
          <span className="text-xs text-muted-foreground">
            Pathway patterns derived from <MonoValue>{pathway.transition_sample_size ?? 0}</MonoValue> observed transitions — {conf.text}.
            Indicators are descriptive of the recorded population, never a rule.
          </span>
        </div>
      )}

      {observed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recorded holders in the migrated source.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Personnel</th>
                <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Appointment Age</th>
                <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Period Held</th>
                <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {observed.slice(0, 60).map((h, i) => {
                const age = ageAtDate(dobByEmployee?.get(h.employee_id), h.start_date);
                return (
                <tr key={h.id || i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium text-foreground">{h.employee_name}</div>
                    <div className="font-mono text-[0.625rem] text-muted-foreground">{h.employee_id}</div>
                  </td>
                  <td className="py-2 pr-4"><MonoValue className="text-xs">{h.rank || '—'}</MonoValue></td>
                  <td className="py-2 pr-4">
                    {age != null
                      ? <><MonoValue className="text-xs">{age}</MonoValue> <span className="text-xs text-muted-foreground">yrs</span></>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">
                    {h.start_date || '—'} → {h.end_date || (h.is_open_ended ? 'Current' : '—')}
                  </td>
                  <td className="py-2 pr-4"><MonoValue className="text-xs">{tenureLabel(rowTenureMonths(h))}</MonoValue></td>
                  <td className="py-2">
                    {h.is_current
                      ? <span className="text-xs font-medium text-ready">Current holder</span>
                      : <span className="text-xs text-muted-foreground">Historical</span>}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {observed.length > 60 && (
            <p className="mt-2 text-xs text-muted-foreground">Showing 60 of {observed.length} recorded holdings.</p>
          )}
        </div>
      )}
    </div>
  );
}