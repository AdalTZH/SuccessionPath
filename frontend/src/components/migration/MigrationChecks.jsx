import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { MonoValue } from '@/components/badges';

export default function MigrationChecks({ checks = [] }) {
  const passed = checks.filter(c => c.status === 'pass').length;
  const review = checks.filter(c => c.status !== 'pass').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Checks Passed</p>
          <p className="mt-0.5 text-lg font-semibold text-ready"><MonoValue>{passed}</MonoValue> / {checks.length}</p>
        </div>
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Requiring HR Review</p>
          <p className={`mt-0.5 text-lg font-semibold ${review > 0 ? 'text-review' : 'text-muted-foreground'}`}><MonoValue>{review}</MonoValue></p>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          Checks are evaluated against the imported data. Items marked for review are recorded as they appear in the source — the import never corrects or infers.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-sm border border-border">
        {checks.map((c, i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-2.5">
            {c.status === 'pass'
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ready" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-review" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}