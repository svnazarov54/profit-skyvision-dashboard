import { useCallback, useEffect, useState, useTransition } from 'react';
import { DEFAULT_FILTERS, type FilterState } from '../types/filters';
import { readFiltersFromUrl, syncFiltersToUrl } from '../utils/filterUrl';

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    syncFiltersToUrl(filters);
  }, [filters]);

  useEffect(() => {
    const onPopState = () => setFilters(readFiltersFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    });
  }, []);

  const toggleArrayFilter = useCallback(
    (key: 'networks' | 'cities' | 'federalSubjects' | 'points' | 'skus', value: string) => {
      startTransition(() => {
        setFilters((prev) => {
          const arr = prev[key];
          const next = arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value];
          return { ...prev, [key]: next };
        });
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    startTransition(() => {
      setFilters(DEFAULT_FILTERS);
    });
  }, []);

  const setDateRange = useCallback(
    (dateFrom: string | null, dateTo: string | null) => {
      startTransition(() => {
        setFilters((prev) => ({
          ...prev,
          periodPreset: 'all',
          dateFrom,
          dateTo,
        }));
      });
    },
    [],
  );

  return {
    filters,
    isFilterPending: isPending,
    updateFilter,
    toggleArrayFilter,
    resetFilters,
    setFilters,
    setDateRange,
  };
}
