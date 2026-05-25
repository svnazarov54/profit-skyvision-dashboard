import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FILTERS, type FilterState } from '../types/filters';
import { readFiltersFromUrl, syncFiltersToUrl } from '../utils/filterUrl';

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl());

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
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback(
    (key: 'networks' | 'cities' | 'federalSubjects' | 'points', value: string) => {
      setFilters((prev) => {
        const arr = prev[key];
        const next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return { filters, updateFilter, toggleArrayFilter, resetFilters, setFilters };
}
