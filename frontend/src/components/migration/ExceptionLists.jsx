import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { MonoValue } from '@/components/badges';
import { downloadCsv } from '@/lib/csvDownload';

function Group({ group }) {
  const [open, setOpen] = useState(false);
  const empty = !group.rows.length;

  return (
    <div className="rounded-sm border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen(!open)} disabled={empty} className="flex min-w-0 items-center gap-1.5 text-left disabled:cursor-default">
          {!empty && (open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)}
          <span className="text-sm font-medium text-foreground">{group.title}</span>
          <MonoValue className={empty ? 'text-xs text-ready' : 'text-xs text-review'}>{group.rows.length}</MonoValue>
        </button>
        <button
          type="button"
          disabled={empty}
          onClick={() => downloadCsv(group.filename, group.rows, group.columns)}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[0.6875rem] font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> Download CSV
        </button>
      </div>
      {group.description && <p className="px-3 pb-2 text-xs text-muted-foreground">{group.description}</p>}
      {empty && <p className="px-3 pb-2.5 text-xs text-ready">No exceptions of this type were found.</p>}
      {open && !empty && (
        <div className="max-h-72 overflow-auto border-t border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left">
                {group.columns.map(c => (
                  <th key={c.label} className="px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {group.columns.map(c => (
                    <td key={c.label} className="px-3 py-1.5 text-foreground">{String(c.get(r) ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {group.rows.length > 200 && (
            <p className="px-3 py-2 text-[0.625rem] text-muted-foreground">Showing first 200 of {group.rows.length}. Download the CSV for the full list.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExceptionLists({ groups = [] }) {
  return (
    <div className="space-y-2">
      {groups.map(g => <Group key={g.key} group={g} />)}
    </div>
  );
}