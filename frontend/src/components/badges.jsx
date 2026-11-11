import React from 'react';
import { cn } from '@/lib/utils';

const RATING_LABELS = {
  1: 'Does Not Meet',
  2: 'Partly Meets',
  3: 'Fully Meets',
  4: 'Exceeds',
  5: 'Exceptional'
};

export function AIPill({ className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-sm bg-ai-soft px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ai',
      className
    )}>
      <span className="h-1 w-1 rounded-full bg-ai" />
      AI Assisted
    </span>
  );
}

export function ReviewPill({ children = 'Review Required', className, onClick, title }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' } : {})}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review',
        onClick && 'cursor-pointer hover:bg-amber-100 hover:underline',
        className
      )}
    >
      <span className="h-1 w-1 rounded-full bg-review" />
      {children}
    </Tag>
  );
}

export function ReadyPill({ children = 'Ready', className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ready',
      className
    )}>
      <span className="h-1 w-1 rounded-full bg-ready" />
      {children}
    </span>
  );
}

export function GovernancePill({ children = 'Governance Review Required', className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review',
      className
    )}>
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-review border-amber-200',
    Low: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide',
      map[priority] || map.Low
    )}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status, onClick, title }) {
  const reviewStates = ['Review Required', 'Clarification Required', 'Incomplete', 'Action Required'];
  const readyStates = ['Ready for Calibration', 'Ready for Decision', 'Calibrated', 'Finalised', 'Eligible', 'Ready'];
  const isReview = reviewStates.some(s => status?.includes(s));
  const isReady = readyStates.some(s => status === s);
  const cls = isReview
    ? 'bg-amber-50 text-review border-amber-200'
    : isReady
      ? 'bg-emerald-50 text-ready border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' } : {})}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide',
        cls,
        onClick && 'cursor-pointer hover:underline'
      )}
    >
      {status}
    </Tag>
  );
}

export function RatingBadge({ rating, size = 'sm' }) {
  const cls = rating >= 4 ? 'border-emerald-200 bg-emerald-50 text-ready'
    : rating === 3 ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-amber-200 bg-amber-50 text-review';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-sm border font-mono',
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
      cls
    )}>
      <span className="font-semibold">{rating}</span>
      <span className="font-sans text-[0.625rem] uppercase tracking-wide opacity-70">{RATING_LABELS[rating]?.split(' ')[0]}</span>
    </span>
  );
}

export function MonoValue({ children, className }) {
  return <span className={cn('font-mono text-mono-value', className)}>{children}</span>;
}

export function SectionLabel({ children, className }) {
  return <p className={cn('text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground', className)}>{children}</p>;
}