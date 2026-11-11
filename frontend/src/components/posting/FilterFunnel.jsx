import React from 'react';
import { MonoValue } from '@/components/badges';
import { ChevronRight } from 'lucide-react';

// Visual funnel showing population reduction at each hard-filter step.
export default function FilterFunnel({ steps }) {
  const initial = steps[0]?.remaining || 0;
  return (
    <div className="rounded-sm border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Auto-Filter Funnel</h3>
        <p className="text-xs text-muted-foreground">Population reduction at each mandatory criterion — {initial} → {steps[steps.length - 1]?.remaining || 0} potential candidates</p>
      </div>
      <div className="p-4">
        {steps.map((step, i) => {
          const pct = initial ? Math.round((step.remaining / initial) * 100) : 0;
          const isLast = i === steps.length - 1;
          const excluded = step.excludedNames || [];
          return (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  {step.label}
                </span>
                <span className={`font-mono text-sm font-semibold ${isLast ? 'text-ready' : 'text-mono-value'}`}>
                  {step.remaining}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-secondary">
                <div
                  className={`h-full transition-all ${isLast ? 'bg-ready' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {excluded.length > 0 && (
                <p className="mt-0.5 text-[0.6875rem] text-review">
                  Excluded: {excluded.join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{steps[steps.length - 1]?.remaining || 0}</span> potential candidates after mandatory filtering. Soft criteria and skills gaps evaluated in the candidate list below.
        </p>
      </div>
    </div>
  );
}