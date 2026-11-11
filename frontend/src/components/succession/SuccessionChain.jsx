import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReadyPill, ReviewPill, StatusBadge, MonoValue, AIPill } from '@/components/badges';
import { profileTabPath, tabForText, reviewFocus } from '@/lib/reviewTabs';
import { ChevronDown, User, Crown, Users, GitBranch } from 'lucide-react';

const DEPTH_STYLES = {
  'Healthy': 'border-l-ready bg-emerald-50/50',
  'Limited': 'border-l-amber-400 bg-amber-50/30',
  'At Risk': 'border-l-review bg-amber-50/50',
  'Vacant/Critical': 'border-l-destructive bg-red-50/50'
};

function ChainNode({ node, isCurrent = false }) {
  const navigate = useNavigate();
  if (!node || (!node.id && !node.name)) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-dashed border-border bg-secondary/20 px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Unassigned</p>
          <p className="text-[0.625rem] text-muted-foreground">{isCurrent ? 'No current holder' : 'No successor identified'}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
        {isCurrent ? <Crown className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{node.name}</p>
        <p className="text-[0.625rem] text-muted-foreground">{node.role}</p>
      </div>
      {node.readiness && (
        <div className="flex items-center gap-1.5">
          {node.satisfactionPct > 0 && (
            <span className={`rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${node.satisfactionPct >= 60 ? 'bg-emerald-50 text-ready' : 'bg-red-50 text-destructive'}`}>{node.satisfactionPct}%</span>
          )}
          {node.readiness === 'Ready' ? <ReadyPill>{node.readiness}</ReadyPill> : node.readiness === 'Not Eligible' ? <span className="text-[0.625rem] font-semibold text-destructive">Not Eligible</span> : (
            <ReviewPill
              onClick={() => navigate(profileTabPath(node.id, tabForText(node.readiness), reviewFocus(node.matchResult, node.readiness)))}
              title={`Open ${node.name}'s profile at the tab holding what needs review`}
            >{node.readiness}</ReviewPill>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuccessionChain({ chain, plan, depth, onReviewBasis }) {
  if (!chain) return null;
  // Depth is classified from the current successor slots, so the badge always reflects what is shown.
  const shownDepth = depth || plan.succession_depth;
  const depthStyle = DEPTH_STYLES[shownDepth] || 'border-l-border';

  return (
    <div className={`rounded-sm border border-border border-l-4 ${depthStyle} bg-card p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{plan.appointment_title}</h3>
          <p className="text-xs text-muted-foreground">{chain.appointment?.organisation || ''} · <MonoValue>{plan.appointment_id}</MonoValue></p>
        </div>
        <div className="flex items-center gap-2">
          {plan.successor_basis && (
            <ReviewPill
              onClick={onReviewBasis ? () => onReviewBasis(plan) : undefined}
              title="Review the recorded-history basis behind these successor slots"
            >{plan.successor_basis}</ReviewPill>
          )}
          <StatusBadge status={shownDepth} />
          <AIPill />
        </div>
      </div>

      {/* Succession chain */}
      <div className="mt-3 space-y-1.5">
        <ChainNode node={chain.currentHolder} isCurrent={true} />
        <div className="ml-3.5 border-l-2 border-dashed border-border pl-3.5">
          <div className="space-y-1.5">
            <ChainNode node={chain.primary} />
            <ChainNode node={chain.alternate1} />
            <ChainNode node={chain.alternate2} />
          </div>
        </div>
        {plan.successor_evidence && (
          <div className="mt-2 rounded-sm border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">Recorded-history basis — HR confirmation required</p>
            <p className="mt-0.5 text-xs text-foreground">{plan.successor_evidence}</p>
          </div>
        )}
        {chain.pipeline.length > 0 && (
          <div className="ml-3.5 border-l-2 border-dashed border-border pl-3.5">
            <div className="flex items-center gap-1.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <GitBranch className="h-3 w-3" /> Development Pipeline
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chain.pipeline.map(p => (
                <span key={p.id} className="rounded-sm border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}