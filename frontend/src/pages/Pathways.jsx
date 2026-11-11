import React, { useState } from 'react';
import CareerPathwayView from '@/components/pathways/CareerPathwayView';
import PostingImpactView from '@/components/pathways/PostingImpactView';
import { Route, Network } from 'lucide-react';

export default function Pathways() {
  // Deep link from a trigger case, e.g. /pathways?view=impact&appt=…&person=…
  const urlParams = new URLSearchParams(window.location.search);
  const [view, setView] = useState(urlParams.get('view') === 'impact' ? 'impact' : 'pathway');
  const [pathwayPresets, setPathwayPresets] = useState({ personId: urlParams.get('person') || '', apptId: urlParams.get('appt') || '' });
  const [impactPresets, setImpactPresets] = useState({ personId: urlParams.get('person') || '', apptId: urlParams.get('appt') || '' });

  const handleAssessImpact = (personId, apptId) => {
    setImpactPresets({ personId, apptId });
    setView('impact');
  };

  const handleViewPathway = (personId, apptId) => {
    setPathwayPresets({ personId, apptId });
    setView('pathway');
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">Pathways & Impact</h1>
        <p className="text-sm text-muted-foreground">Career pathway planning and posting impact analysis. AI identifies gaps and trade-offs — HR decides all actions.</p>
      </div>

      <div className="mb-4 flex rounded-sm border border-border bg-card p-0.5">
        <button
          onClick={() => setView('pathway')}
          className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${view === 'pathway' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Route className="h-3.5 w-3.5" /> Career Pathway
        </button>
        <button
          onClick={() => setView('impact')}
          className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium ${view === 'impact' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Network className="h-3.5 w-3.5" /> Posting Impact
        </button>
      </div>

      {view === 'pathway' ? (
        <CareerPathwayView onAssessImpact={handleAssessImpact} presetPersonId={pathwayPresets.personId} presetApptId={pathwayPresets.apptId} />
      ) : (
        <PostingImpactView onViewPathway={handleViewPathway} presetApptId={impactPresets.apptId} presetPersonId={impactPresets.personId} />
      )}
    </div>
  );
}