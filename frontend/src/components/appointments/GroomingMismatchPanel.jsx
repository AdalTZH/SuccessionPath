import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AIPill, SectionLabel } from '@/components/badges';
import { AlertTriangle, ShieldCheck, Loader2, UserRoundSearch } from 'lucide-react';

// Grooming rule: a P1/P2 appointment is a grooming appointment.
//  - A non-talent planned into one is a placement mismatch, cleared only by an HR override with a reason.
//  - A talent + wrangler who is NOT in one is an unplaced talent and must be surfaced to HR.
export default function GroomingMismatchPanel({ placements = [], unplaced = [], onOverridden }) {
  const [openId, setOpenId] = useState(null);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  const total = placements.length + unplaced.length;
  if (total === 0) return null;

  const save = async (row) => {
    if (!justification.trim()) return;
    setSaving(true);
    try {
      await base44.entities.PostingAssignment.update(row.id, {
        hr_override: true,
        override_justification: justification.trim(),
        status: 'Confirmed'
      });
      setOpenId(null);
      setJustification('');
      onOverridden?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-5 rounded-sm border border-destructive border-l-4 bg-red-50/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-semibold text-destructive">Grooming Mismatch</h2>
        <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-destructive-foreground">
          {total} {total === 1 ? 'case' : 'cases'}
        </span>
        <AIPill />
      </div>
      <p className="mt-1 text-xs text-foreground">
        A P1/P2 appointment is a grooming appointment. Talent (T1/T1+) + wrangler individuals belong in one; anyone else
        placed in one needs an HR override with a recorded reason.
      </p>

      {unplaced.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <UserRoundSearch className="h-3.5 w-3.5 text-destructive" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Talent + Wrangler — Not In A P1/P2 Grooming Appointment ({unplaced.length})
            </h3>
          </div>
          <div className="mt-2 space-y-2">
            {unplaced.map(row => (
              <div key={row.id} className="rounded-sm border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/people/${encodeURIComponent(row.employee.employee_id)}`} className="text-sm font-medium text-foreground hover:underline">
                        {row.employee.name}
                      </Link>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">{row.employee.employee_id}</span>
                      <span className="text-[0.6875rem] text-muted-foreground">{row.employee.rank} · {row.employee.vocation}</span>
                      <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary-foreground">
                        Talent {row.employee.talent}
                      </span>
                      <span className="rounded-sm border border-review bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review">
                        Wrangler
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Holds <span className="font-mono text-foreground">{row.appointment || 'no recorded appointment'}</span> — not a P1/P2 grooming appointment.
                    </p>
                  </div>
                  <Link
                    to={`/people/${encodeURIComponent(row.employee.employee_id)}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-foreground hover:bg-secondary"
                  >
                    Open profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {placements.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-destructive" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Planned Into A Grooming Appointment Without A Talent Tag ({placements.length})
            </h3>
          </div>
          <div className="mt-2 space-y-2">
            {placements.map(row => (
              <div key={row.id} className="rounded-sm border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/people/${encodeURIComponent(row.employee.employee_id)}`} className="text-sm font-medium text-foreground hover:underline">
                        {row.employee.name}
                      </Link>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">{row.employee.employee_id}</span>
                      <span className="text-[0.6875rem] text-muted-foreground">{row.employee.rank} · {row.employee.vocation}</span>
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        No talent tag
                      </span>
                      {row.employee.wrangler === 'Y' && (
                        <span className="rounded-sm border border-review bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-review">
                          Wrangler — should be a talent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Planned into <span className="font-mono text-foreground">{row.appointment}</span>
                      {' · '}
                      <span className="font-semibold text-foreground">{row.tier} grooming</span>
                      {row.speciality && <> · speciality {row.speciality}</>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setOpenId(openId === row.id ? null : row.id); setJustification(''); }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-review bg-amber-50 px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-review hover:bg-amber-100"
                  >
                    <ShieldCheck className="h-3 w-3" /> Record override
                  </button>
                </div>

                {openId === row.id && (
                  <div className="mt-2 rounded-sm border border-border bg-secondary/30 p-2">
                    <SectionLabel>Justification — required</SectionLabel>
                    <textarea
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      rows={2}
                      placeholder="Why is a non-talent placed in this grooming appointment?"
                      className="mt-1 w-full rounded-sm border border-border bg-card px-2 py-1.5 text-xs text-foreground"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button onClick={() => setOpenId(null)} className="rounded-sm border border-border bg-card px-2 py-1 text-[0.625rem] font-medium text-foreground hover:bg-secondary">Cancel</button>
                      <button
                        onClick={() => save(row)}
                        disabled={!justification.trim() || saving}
                        className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[0.625rem] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {saving && <Loader2 className="h-3 w-3 animate-spin" />} Confirm override
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-[0.6875rem] text-muted-foreground">
        An override is recorded against the placement with the HR user's reason and is retained in the record.
      </p>
    </div>
  );
}