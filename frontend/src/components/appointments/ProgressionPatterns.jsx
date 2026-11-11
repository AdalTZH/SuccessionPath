import React from 'react';
import { pct } from '@/lib/pathwayHistoryEngine';

export default function ProgressionPatterns({ title, entries = [], emptyText }) {
  return (
    <div>
      <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5">
          {entries.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="truncate text-xs text-foreground">{e.label}</span>
              <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground">{e.count} · {pct(e.share)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}