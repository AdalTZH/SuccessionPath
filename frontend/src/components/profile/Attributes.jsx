import React from 'react';
import { RatingBadge, SectionLabel, MonoValue } from '@/components/badges';

const ATTRIBUTE_LABELS = {
  1: 'Below Standard',
  2: 'Developing',
  3: 'Meets Expectation',
  4: 'Strong',
  5: 'Exemplary'
};

export default function Attributes({ items = [] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No attributes recorded. <span className="text-[0.625rem] uppercase tracking-wide">Attributes are distinct from skills — they describe observed behavioural qualities.</span></p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Attribute</th>
            <th className="py-2 pr-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Rating</th>
            <th className="py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a, i) => (
            <tr key={i} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 font-medium text-foreground">{a.attribute}</td>
              <td className="py-2 pr-4"><RatingBadge rating={a.rating} /></td>
              <td className="py-2 text-foreground">{a.evidence || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[0.625rem] uppercase tracking-wide text-muted-foreground">Attributes are configurable and are NOT treated as mandatory posting criteria.</p>
    </div>
  );
}