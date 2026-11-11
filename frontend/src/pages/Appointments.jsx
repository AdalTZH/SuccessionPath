import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PAGE_SIZE, catalogueQuery, fetchCataloguePage, fetchIncumbents, fetchPathways } from '@/lib/appointmentCatalogue';
import AppointmentCatalogueCard from '@/components/appointments/AppointmentCatalogueCard';
import GroomingMismatchPanel from '@/components/appointments/GroomingMismatchPanel';
import { groomingMismatches, unplacedTalents } from '@/lib/grooming';
import { useFilters, isPersonTag, GROOMING_P1_TAG, GROOMING_P2_TAG } from '@/lib/FilterContext';
import { Search, Briefcase } from 'lucide-react';

export default function Appointments() {
  const [query, setQuery] = useState('');
  const filters = useFilters();

  // The population bar's Tag selection narrows the catalogue to a grooming tier or an
  // appointment speciality. Person tags (talent, wrangler) belong to the People list, not here.
  const groomingTier = filters.tag === GROOMING_P1_TAG ? 'P1' : filters.tag === GROOMING_P2_TAG ? 'P2' : '';
  const speciality = !groomingTier && filters.tag !== 'All' && !isPersonTag(filters.tag) ? filters.tag : '';
  const [rows, setRows] = useState([]);
  const [pathways, setPathways] = useState({});
  const [incumbents, setIncumbents] = useState({});
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mismatches, setMismatches] = useState([]);
  const [unplaced, setUnplaced] = useState([]);

  // Two grooming mismatches: a non-talent planned into a P1/P2 grooming appointment, and a
  // talent + wrangler who does not hold one.
  const loadMismatches = async () => {
    const [plans, twRows] = await Promise.all([
      base44.entities.PostingAssignment.list('-created_date', 300),
      base44.entities.Employee.filter({ wrangler: 'Y', talent: { $in: ['T1', 'T1+'] }, archived: { $ne: true } }, { limit: 100 })
    ]);
    const planned = (plans.items || plans).filter(p => p.primary_candidate_id && p.status !== 'Replacement Required');
    const talentWranglers = twRows.items || twRows;
    const labels = [...new Set([
      ...planned.map(p => p.appointment_title || p.appointment_id),
      ...talentWranglers.map(e => e.current_appointment)
    ].filter(Boolean))];
    const ids = [...new Set(planned.map(p => p.primary_candidate_id))];
    const [tierRows, empRows] = await Promise.all([
      labels.length ? base44.entities.AppointmentCatalogue.filter({ label: { $in: labels }, grooming_tier: { $in: ['P1', 'P2'] } }, { limit: 300 }) : { items: [] },
      ids.length ? base44.entities.Employee.filter({ employee_id: { $in: ids } }, { limit: 200 }) : { items: [] }
    ]);
    const tierByLabel = Object.fromEntries((tierRows.items || []).map(c => [c.label, c]));
    const employeeById = Object.fromEntries((empRows.items || []).map(e => [e.employee_id, e]));
    setMismatches(groomingMismatches(planned, tierByLabel, employeeById));
    setUnplaced(unplacedTalents(talentWranglers, tierByLabel));
  };

  useEffect(() => { loadMismatches(); }, []);

  useEffect(() => {
    let cancelled = false;
    const term = query;
    const timer = setTimeout(async () => {
      setLoading(true);
      const [page, count] = await Promise.all([
        fetchCataloguePage({ term, groomingTier, speciality }),
        base44.entities.AppointmentCatalogue.count(catalogueQuery(term, { groomingTier, speciality }))
      ]);
      const labels = page.items.map(i => i.label);
      const [byLabel, holdersByLabel] = await Promise.all([fetchPathways(labels), fetchIncumbents(labels)]);
      if (cancelled) return;
      setRows(page.items);
      setPathways(byLabel);
      setIncumbents(holdersByLabel);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setMatchCount(count);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, groomingTier, speciality]);

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await fetchCataloguePage({ term: query, cursor, groomingTier, speciality });
    const labels = page.items.map(i => i.label);
    const [byLabel, holdersByLabel] = await Promise.all([fetchPathways(labels), fetchIncumbents(labels)]);
    setRows(prev => [...prev, ...page.items]);
    setPathways(prev => ({ ...prev, ...byLabel }));
    setIncumbents(prev => ({ ...prev, ...holdersByLabel }));
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
    setLoadingMore(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Every appointment held in the imported source, taken verbatim from the workbook’s appointment column.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Grooming P1/P2</span> marks the 5% most frequently held appointments — the visible
            grooming posts. The vocation badge is the speciality the appointment is tied to, derived from who has held it;
            <span className="font-semibold text-foreground"> ANYAIR</span> means generalist, open to any air vocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search appointment label…"
              className="w-72 rounded-sm border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Link to="/posting-workbench" className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Briefcase className="h-3.5 w-3.5" /> Open Workbench
          </Link>
        </div>
      </div>

      <GroomingMismatchPanel placements={mismatches} unplaced={unplaced} onOverridden={loadMismatches} />

      <p className="mb-3 text-xs text-muted-foreground">
        {loading
          ? 'Loading appointment catalogue…'
          : `${rows.length.toLocaleString()} of ${matchCount.toLocaleString()} appointment labels shown`}
        {filters.tag !== 'All' && ` · Tag: ${filters.tag}`}
        {' · '}Identical labels are not assumed to be the same unique position until HR validates them.
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-sm border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No appointment label matches {query ? `“${query}”` : 'this selection'}
          {filters.tag !== 'All' && ` with the tag “${filters.tag}”`}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map(row => (
              <AppointmentCatalogueCard
                key={row.id}
                entry={row}
                pathway={pathways[row.label]}
                incumbents={incumbents[row.label] || []}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-sm border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, matchCount - rows.length)} more — ${(matchCount - rows.length).toLocaleString()} remaining`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}