import React, { useState, useRef, useEffect } from 'react';
import { useFilters } from '@/lib/FilterContext';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

function FilterSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
        
        <span className="text-muted-foreground">{label}:</span>
        <span className="max-w-[9rem] truncate font-mono">{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open &&
      <div className="absolute right-0 z-50 mt-1 max-h-64 min-w-[8rem] overflow-y-auto rounded-sm border border-border bg-card py-1 shadow-lg">
          {options.map((opt) =>
        <button
          key={opt}
          onClick={() => {onChange(opt);setOpen(false);}}
          className={cn(
            'block w-full px-3 py-1.5 text-left text-xs hover:bg-secondary',
            opt === value ? 'font-semibold text-primary' : 'text-foreground'
          )}>
          
              {opt}
            </button>
        )}
        </div>
      }
    </div>);

}

export default function Topbar() {
  const { vocation, setVocation, rank, setRank, org, setOrg, tag, setTag, vocations, ranks, orgs, tags } = useFilters();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      {/* Shadow mode governance bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-1.5 text-white">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider">PoC — Shadow Mode</span>
          <span className="hidden sm:inline text-slate-400">|</span>
          

          
        </div>
        <span className="hidden lg:inline text-[0.6875rem] text-slate-400">
          AI consolidates and filters — HR confirms all posting decisions.
        </span>
      </div>

      {/* Utility header with global filters */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Population</span>
          <FilterSelect label="Vocation" value={vocation} options={vocations} onChange={setVocation} />
          <FilterSelect label="Rank" value={rank} options={ranks} onChange={setRank} />
          <FilterSelect label="Org" value={org} options={orgs} onChange={setOrg} />
          <FilterSelect label="Tag" value={tag} options={tags} onChange={setTag} />
        </div>
      </div>
    </header>);

}