import React from 'react';
import { pct } from '@/lib/pathwayHistoryEngine';

const NODE_W = 240;
const NODE_H = 46;
const ROW_H = 64;
const W = 920;

function truncate(s, n) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function nodePos(i, n, height) {
  return height / 2 + (i - (n - 1) / 2) * ROW_H;
}

function Node({ x, y, label, sub, tone }) {
  const cls = tone === 'focus'
    ? 'fill-primary stroke-primary'
    : tone === 'successor'
      ? 'fill-accent stroke-border'
      : 'fill-secondary stroke-border';
  const textCls = tone === 'focus' ? 'fill-primary-foreground' : 'fill-foreground';
  const subCls = tone === 'focus' ? 'fill-primary-foreground' : 'fill-muted-foreground';
  return (
    <g>
      <rect x={x} y={y - NODE_H / 2} width={NODE_W} height={NODE_H} rx="4" strokeWidth="1" className={cls} />
      <text x={x + NODE_W / 2} y={y - 2} textAnchor="middle" className={textCls} fontSize="11.5" fontWeight="600">
        {truncate(label, 30)}
      </text>
      {sub && (
        <text x={x + NODE_W / 2} y={y + 14} textAnchor="middle" className={subCls} fontSize="10">
          {sub}
        </text>
      )}
    </g>
  );
}

export default function PathwayFlowDiagram({ focusLabel, focusSub, predecessors = [], successors = [] }) {
  const pre = predecessors.slice(0, 7);
  const suc = successors.slice(0, 7);
  const rows = Math.max(pre.length, suc.length, 1);
  const height = Math.max(230, rows * ROW_H + 70);
  const midY = height / 2;
  const leftX = 8;
  const rightX = W - NODE_W - 8;
  const centreX = W / 2 - NODE_W / 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={`Observed pathway for ${focusLabel}`}>
        {pre.map((p, i) => {
          const y = nodePos(i, pre.length, height);
          return (
            <path key={`pe${i}`} fill="none" strokeWidth="1.5" className="stroke-border"
              d={`M ${leftX + NODE_W} ${y} C ${leftX + NODE_W + 60} ${y}, ${centreX - 60} ${midY}, ${centreX} ${midY}`} />
          );
        })}
        {suc.map((s, i) => {
          const y = nodePos(i, suc.length, height);
          return (
            <path key={`se${i}`} fill="none" strokeWidth="1.5" className="stroke-border"
              d={`M ${centreX + NODE_W} ${midY} C ${centreX + NODE_W + 60} ${midY}, ${rightX - 60} ${y}, ${rightX} ${y}`} />
          );
        })}

        {pre.map((p, i) => (
          <Node key={`p${i}`} x={leftX} y={nodePos(i, pre.length, height)}
            label={p.label} sub={`${p.count} holders · ${pct(p.share)} of arrivals`} tone="predecessor" />
        ))}
        {suc.map((s, i) => (
          <Node key={`s${i}`} x={rightX} y={nodePos(i, suc.length, height)}
            label={s.label} sub={`${s.count} holders · ${pct(s.share)} of moves`} tone="successor" />
        ))}

        <Node x={centreX} y={midY} label={focusLabel} sub={focusSub} tone="focus" />

        <text x={leftX + NODE_W / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize="9.5" fontWeight="600" letterSpacing="1">
          ARRIVED FROM
        </text>
        <text x={rightX + NODE_W / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize="9.5" fontWeight="600" letterSpacing="1">
          MOVED ON TO
        </text>
      </svg>
      {pre.length === 0 && suc.length === 0 && (
        <p className="px-1 pb-2 text-xs text-muted-foreground">No observed transitions recorded for this appointment yet.</p>
      )}
    </div>
  );
}