import { useEffect, useRef, useState } from 'react';
import { countCatalogue, fetchCataloguePage } from '@/lib/appointmentCatalogue';

// Shared, server-paged search over the imported appointment catalogue.
// Every appointment label is reachable: the first page loads immediately, the rest scroll in.
export default function useCatalogueSearch({ term = '', enabled = true, debounce = 200, sort = '-usage_count', occupiedOnly = false } = {}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingMore = useRef(false);
  const listVersion = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const version = listVersion.current + 1;
    listVersion.current = version;
    setLoading(true);
    setRows([]);
    setCursor(null);
    setHasMore(false);
    const timer = setTimeout(async () => {
      const [page, count] = await Promise.all([
        fetchCataloguePage({ term, sort, occupiedOnly }),
        countCatalogue(term, { occupiedOnly })
      ]);
      if (cancelled || version !== listVersion.current) return;
      setRows(page.items);
      setTotal(count);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setLoading(false);
    }, debounce);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, enabled, debounce, sort, occupiedOnly]);

  const loadMore = () => {
    if (fetchingMore.current || loading || !hasMore || !cursor) return;
    const version = listVersion.current;
    fetchingMore.current = true;
    setLoadingMore(true);
    fetchCataloguePage({ term, sort, occupiedOnly, cursor })
      .then(page => {
        if (version !== listVersion.current) return;
        setRows(prev => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .finally(() => { fetchingMore.current = false; setLoadingMore(false); });
  };

  return { rows, total, hasMore, loading, loadingMore, loadMore };
}