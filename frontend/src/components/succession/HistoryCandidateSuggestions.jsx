import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useCatalogueSearch from '@/lib/useCatalogueSearch';
import { loadHistoryCandidates } from '@/lib/historySuccession';
import { pct } from '@/lib/pathwayHistoryEngine';
import HistoryCandidateCard from '@/components/succession/HistoryCandidateCard';
import { AIPill, MonoValue, SectionLabel } from '@/components/badges';
import { Search } from 'lucide-react';

const ROLES = ['Primary Successor', 'Alternate 1', 'Alternate 2'];

export default function HistoryCandidateSuggestions({ employees, quickPicks = [], initialLabel = '' }) {
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState(initialLabel);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const search = useCatalogueSearch({ term: query, enabled: query.trim().length > 0 });

  useEffect(() => {
    if (!label) { setResult(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const page = await base44.entities.AppointmentPathway.filter({ label }, { limit: 1 });
      const pathway = (page.items || [])[0] || null;
      const res = await loadHistoryCandidates({ label, pathway, employees });
      if (cancelled) return;
      setResult({ label, pathway, ...res });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [label, employees]);

  const candidates = result?.candidates || [];
  const further = candidates.slice(3, 8);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
      <section className="rounded-sm border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Appointment to Test</h3>
          <p className="text-xs text-muted-foreground">Candidates are drawn from the appointments recorded before this one</p>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Appointment label…"
              className="w-full rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {query.trim() && (
            <div className="mt-2 max-h-56 overflow-y-auto">
              {search.loading && <p className="px-1 py-2 text-xs text-muted-foreground">Searching…</p>}
              {!search.loading && search.rows.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">No appointment matches “{query}”.</p>
              )}
              {search.rows.map(c => (
                <button
                  key={c.id || c.label}
                  type="button"
                  onClick={() => { setLabel(c.label); setQuery(''); }}
                  className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {quickPicks.length > 0 && (
            <>
              <SectionLabel className="mt-3">Appointments with a succession plan</SectionLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {quickPicks.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLabel(l)}
                    className={`rounded-sm border px-2 py-1 text-[0.6875rem] font-medium ${
                      label === l ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {!label && (
          <div className="rounded-sm border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Select an appointment to see the successor candidates its recorded history points to.</p>
          </div>
        )}

        {label && loading && (
          <div className="flex h-40 items-center justify-center rounded-sm border border-border bg-card">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-secondary border-t-primary" />
          </div>
        )}

        {label && !loading && result && (
          <>
            <section className="rounded-sm border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{result.label}</h3>
                  <p className="text-xs text-muted-foreground">Drawn from the appointments recorded before this one, and the personnel who held them</p>
                </div>
                <AIPill />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border p-4 sm:grid-cols-4">
                <div>
                  <SectionLabel>Recorded Holdings</SectionLabel>
                  <div className="mt-0.5 text-sm"><MonoValue>{result.pathway?.total_holdings ?? result.holders.length}</MonoValue></div>
                </div>
                <div>
                  <SectionLabel>Observed Arrivals</SectionLabel>
                  <div className="mt-0.5 text-sm"><MonoValue>{result.pathway?.transition_sample_size ?? '—'}</MonoValue></div>
                </div>
                <div>
                  <SectionLabel>Current Holder</SectionLabel>
                  <div className="mt-0.5 text-sm text-foreground">{result.incumbent?.employee_name || 'Not recorded'}</div>
                </div>
                <div>
                  <SectionLabel>Typical Holder Rank</SectionLabel>
                  <div className="mt-0.5 text-sm text-foreground">
                    {result.dominantRank
                      ? <>{result.dominantRank.rank} <span className="text-xs text-muted-foreground">({result.dominantRank.count} of {result.dominantRank.total} recorded)</span></>
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {result.feeders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No observed arrivals are recorded for this appointment, so there are no feeder routes to draw candidates from.
                  </p>
                ) : (
                  <>
                    <SectionLabel>Observed Feeder Appointments</SectionLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {result.feeders.map(f => (
                        <span key={f.label} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary/50 px-2 py-1 text-xs">
                          <span className="font-medium text-foreground">{f.label}</span>
                          <MonoValue className="text-[0.625rem]">{f.count}</MonoValue>
                          <span className="text-[0.625rem] text-muted-foreground">{pct(f.share)}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {result.feeders.length > 0 && (
              <>
                {candidates.length === 0 ? (
                  <div className="rounded-sm border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    No personnel in the current population have held an observed feeder appointment. Personnel who have already held this appointment are excluded.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {ROLES.map((role, i) => (
                      <HistoryCandidateCard key={role} role={role} candidate={candidates[i]} />
                    ))}
                  </div>
                )}

                {further.length > 0 && (
                  <section className="rounded-sm border border-border bg-card">
                    <div className="border-b border-border px-4 py-3">
                      <h3 className="text-sm font-semibold text-foreground">Further Recorded Candidates</h3>
                      <p className="text-xs text-muted-foreground">Next strongest feeder-route matches, beyond the three slots</p>
                    </div>
                    <div className="divide-y divide-border">
                      {further.map(c => (
                        <div key={c.employee_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                          <span className="text-sm text-foreground">
                            {c.person.name} <MonoValue className="text-[0.625rem]">{c.employee_id}</MonoValue>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            via {c.routes[0].label} ({pct(c.routes[0].share)}) · {c.routes.length} feeder route(s)
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              Candidates are derived from recorded history only — they describe observed feeder routes in this population and are never a recommendation. Personnel who have already held the appointment are excluded. HR confirms every linkage.
            </p>
          </>
        )}
      </div>
    </div>
  );
}