import React, { useEffect, useRef, useState } from 'react';
import useCatalogueSearch from '@/lib/useCatalogueSearch';
import { Search, ChevronDown } from 'lucide-react';

export default function WorkbookAppointmentPicker({ value, onChange, buttonClassName = 'min-w-[22rem]', occupiedFirst = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [occupiedOnly, setOccupiedOnly] = useState(false);
  const boxRef = useRef(null);
  const { rows, total, hasMore, loading, loadingMore, loadMore } = useCatalogueSearch({
    term: query,
    enabled: open,
    sort: occupiedFirst ? '-current_holders' : '-usage_count',
    occupiedOnly: occupiedFirst && occupiedOnly
  });

  useEffect(() => {
    const onMouseDown = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground ${buttonClassName}`}
      >
        <span className="truncate font-mono">{value || 'Select a workbook appointment'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-[32rem] max-w-[calc(100vw_-_2rem)] rounded-sm border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search the imported appointment column…"
                className="w-full rounded-sm border border-border bg-background py-1.5 pl-7 pr-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {occupiedFirst && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[0.625rem] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ready" /> Currently occupied</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> No current holder</span>
                </div>
                <label className="flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={occupiedOnly}
                    onChange={e => setOccupiedOnly(e.target.checked)}
                    className="h-3 w-3 accent-[hsl(var(--ready))]"
                  />
                  Occupied only
                </label>
              </div>
            )}
          </div>
          <div
            className="max-h-72 overflow-y-auto"
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) loadMore();
            }}
          >
            {loading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {occupiedOnly ? `No currently occupied appointment matches “${query}”.` : `No appointment matches “${query}”.`}
              </p>
            ) : occupiedFirst ? (
              rows.map(r => {
                const occupied = (r.current_holders || 0) > 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onChange(r.label); setOpen(false); }}
                    className={`flex w-full items-center justify-between gap-3 border-l-2 px-3 py-2 text-left ${
                      occupied ? 'border-l-ready bg-emerald-50/50 hover:bg-emerald-50' : 'border-l-transparent bg-secondary/40 hover:bg-secondary/70'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${occupied ? 'bg-ready' : 'bg-muted-foreground/40'}`} />
                      <span className={`truncate font-mono text-xs ${occupied ? 'text-foreground' : 'text-muted-foreground'}`}>{r.label}</span>
                      {r.grooming_tier && (
                        <span
                          title="P1/P2 grooming appointment — for talent (T1/T1+) + wrangler individuals."
                          className="shrink-0 rounded-sm bg-primary px-1 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-primary-foreground"
                        >
                          {r.grooming_tier}
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 text-[0.625rem] ${occupied ? 'font-semibold text-ready' : 'text-muted-foreground'}`}>
                      {occupied ? `${r.current_holders} currently held` : 'no current holder'} · {r.usage_count} holdings
                    </span>
                  </button>
                );
              })
            ) : (
              rows.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.label); setOpen(false); }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-secondary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-xs text-foreground">{r.label}</span>
                    {r.grooming_tier && (
                      <span
                        title="P1/P2 grooming appointment — for talent (T1/T1+) + wrangler individuals."
                        className="shrink-0 rounded-sm bg-primary px-1 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-primary-foreground"
                      >
                        {r.grooming_tier}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">{r.usage_count} holdings · {r.current_holders || 0} current</span>
                </button>
              ))
            )}
            {loadingMore && <p className="px-3 py-2 text-xs text-muted-foreground">Loading more labels…</p>}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-[0.625rem] text-muted-foreground">
            {loading
              ? 'Reading the imported appointment labels…'
              : `${rows.length.toLocaleString()} of ${total.toLocaleString()} appointment labels listed${hasMore ? ' — scroll for more' : ' — end of list'}`}
            {!loading && occupiedFirst && !occupiedOnly && ' · currently occupied listed first'}
          </div>
        </div>
      )}
    </div>
  );
}