import React from 'react';
import { Link } from 'react-router-dom';

// W = wrangler, T1 / T1+ = talent tier, shown beside the incumbent's name.
function standingTags(person) {
  const tags = [];
  if (person.wrangler === 'Y') tags.push('W');
  if (person.talent) tags.push(person.talent);
  return tags;
}

// Who holds this appointment now — the open-ended appointment on their record.
// A label can be carried by more than one person (titles repeat across separate seats), so the
// card names a single incumbent and leaves the rest to the holder count and the explorer.
export default function IncumbentLine({ people = [], max = 1 }) {
  if (people.length === 0) {
    return (
      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
        No current incumbent recorded
      </p>
    );
  }

  const shown = people.slice(0, max);

  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Incumbent</span>
      {shown.map(p => (
        <span key={p.employee_id} className="inline-flex items-baseline gap-1">
          <Link
            to={`/people/${encodeURIComponent(p.employee_id)}`}
            className="font-medium text-primary hover:underline"
          >
            {p.name}
          </Link>
          {standingTags(p).length > 0 && (
            <span
              title="W = wrangler · T1/T1+ = talent tier"
              className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              ({standingTags(p).join(', ')})
            </span>
          )}
          <span className="font-mono text-[0.625rem] text-muted-foreground">{p.rank}</span>
        </span>
      ))}
    </p>
  );
}