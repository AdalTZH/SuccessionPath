import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { groomingStanding } from '@/lib/grooming';
import { cn } from '@/lib/utils';

// A P1/P2 appointment is a grooming appointment, and a talent (T1/T1+) + wrangler individual
// belongs in one — so their grooming standing is shown wherever their appointment appears.
export default function GroomingTag({ employee, tier, className }) {
  const standing = groomingStanding(employee, { [employee?.current_appointment]: tier });
  if (!standing.required) return null;

  if (standing.placed) {
    return (
      <span
        title="Talent + wrangler, holding a P1/P2 grooming appointment."
        className={cn('inline-flex items-center rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground', className)}
      >
        Grooming {tier}
      </span>
    );
  }

  return (
    <span
      title="Talent + wrangler individuals belong in a P1/P2 grooming appointment. This appointment is not one — HR to review."
      className={cn('inline-flex items-center gap-1 rounded-sm border border-review bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review', className)}
    >
      <AlertTriangle className="h-2.5 w-2.5" /> Grooming mismatch
    </span>
  );
}