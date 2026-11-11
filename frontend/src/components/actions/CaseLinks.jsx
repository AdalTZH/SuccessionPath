import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Network } from 'lucide-react';

// Direct links from a trigger case into the individual's Career Pathway and the Posting Impact view.
export default function CaseLinks({ row }) {
  const navigate = useNavigate();
  if (!row?.pathwayPath && !row?.impactPath) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {row.pathwayPath && (
        <button
          onClick={() => navigate(row.pathwayPath)}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[0.625rem] font-medium text-foreground hover:bg-secondary"
        >
          <Route className="h-3 w-3" /> Career Pathway
        </button>
      )}
      {row.impactPath && (
        <button
          onClick={() => navigate(row.impactPath)}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[0.625rem] font-medium text-foreground hover:bg-secondary"
        >
          <Network className="h-3 w-3" /> Posting Impact
        </button>
      )}
    </div>
  );
}