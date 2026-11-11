import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AIPill, MonoValue } from '@/components/badges';

function ageAt(dob, eventDate) {
  if (!dob || !eventDate) return null;
  const d1 = new Date(dob);
  const d2 = new Date(eventDate);
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round(((d2 - d1) / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

export default function RankOverAgeChart({ employee }) {
  const data = useMemo(() => {
    const history = (employee.career_history || [])
      .filter(h => h.start_date)
      .map(h => ({
        appointment: h.appointment || '—',
        age: ageAt(employee.dob, h.start_date),
        start_date: h.start_date,
        duration: h.duration
      }))
      .filter(d => d.age !== null && d.age >= 0)
      .sort((a, b) => a.age - b.age);
    return history.map((d, i) => ({ ...d, idx: i + 1 }));
  }, [employee]);

  if (data.length < 2) {
    return <p className="text-sm text-muted-foreground">Insufficient data for ROA chart — requires DOB and dated career history entries.</p>;
  }

  const yTicks = data.map(d => d.idx);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Route of Advancement (ROA) — Career Progression</p>
        <AIPill />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="age"
            name="Age"
            unit=" yrs"
            type="number"
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Age (years)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <YAxis
            dataKey="idx"
            name="Career Step"
            domain={[0, data.length + 1]}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => {
              const entry = data.find(d => d.idx === v);
              return entry ? `${v}` : '';
            }}
            label={{ value: 'Career Step', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-sm border border-border bg-card p-2 text-xs shadow-sm">
                  <div className="font-medium text-foreground">{d.appointment}</div>
                  <div className="text-muted-foreground">Age at start: <MonoValue>{d.age}</MonoValue> yrs</div>
                  <div className="text-muted-foreground">From: <MonoValue>{d.start_date}</MonoValue></div>
                  {d.duration && <div className="text-muted-foreground">Duration: {d.duration}</div>}
                </div>
              );
            }}
          />
          <Line type="stepAfter" dataKey="idx" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[0.625rem] text-muted-foreground">
        Each step represents a career milestone plotted by age at the point of transition. Steeper rise = faster advancement along the Route of Advancement. AI-assisted visualisation — indicative only.
      </p>
    </div>
  );
}