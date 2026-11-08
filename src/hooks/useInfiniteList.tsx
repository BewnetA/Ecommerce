import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface UseInfiniteListOptions<T> {
  fetchFn: (offset: number, limit: number) => Promise<T[]>;
  limit?: number;
  deps?: any[];
}

export function useInfiniteList<T>({
  fetchFn,
  limit = 50,
  deps = [],
}: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const itemsLengthRef = useRef(0);
  itemsLengthRef.current = items.length;

  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    isFetchingRef.current = true;
    try {
      const data = await fetchFnRef.current(0, limit);
      setItems(data);
      const more = data.length >= limit;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch (err) {
      console.error('Error fetching initial page (50 items):', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [limit]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    const nextOffset = itemsLengthRef.current;
    try {
      const data = await fetchFnRef.current(nextOffset, limit);
      setItems((prev) => [...prev, ...data]);
      const more = data.length >= limit;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch (err) {
      console.error('Error fetching next page of items:', err);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [limit]);

  // Trigger reload whenever dependencies (filters, search, category, etc.) change
  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Sentinel ref with IntersectionObserver
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isFetchingRef.current && hasMoreRef.current) {
            loadMore();
          }
        },
        { rootMargin: '300px' }
      );
      observerRef.current.observe(node);
    },
    [loadMore]
  );

  // Window scroll fallback
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 350
      ) {
        if (!isFetchingRef.current && hasMoreRef.current) {
          loadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return {
    items,
    setItems,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reload: loadInitial,
    sentinelRef,
  };
}

export const InfiniteScrollSentinel: React.FC<{
  sentinelRef?: (node: HTMLElement | null) => void;
  loadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
}> = ({ sentinelRef, loadingMore, hasMore, itemCount }) => {
  return (
    <div
      ref={sentinelRef}
      className="py-6 flex flex-col items-center justify-center text-sm text-gray-500 min-h-[40px]"
    >
      {loadingMore && (
        <div className="flex items-center gap-2.5 text-primary font-semibold text-xs py-2 px-4 rounded-full bg-primary/10 border border-primary/20">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading next 50 items...</span>
        </div>
      )}
      {!hasMore && itemCount > 0 && (
        <span className="text-xs text-gray-400">All {itemCount} items loaded</span>
      )}
    </div>
  );
};

