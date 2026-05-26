import {
  DEFAULT_FILTERS,
  type FilterState,
  type PeriodPreset,
} from '../types/filters';

const VALID_PRESETS = new Set<PeriodPreset>([
  'all',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'current_year',
  'previous_year',
]);

function parsePreset(value: string | null): PeriodPreset {
  if (value && VALID_PRESETS.has(value as PeriodPreset)) {
    return value as PeriodPreset;
  }
  return 'all';
}

/** yyyy-MM month string from URL */
function parseMonth(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? value : null;
}

export function filtersToSearchParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.periodPreset !== 'all') {
    params.set('preset', filters.periodPreset);
  }
  if (filters.dateFrom) params.set('from', filters.dateFrom);
  if (filters.dateTo) params.set('to', filters.dateTo);

  for (const value of filters.networks) params.append('network', value);
  for (const value of filters.federalSubjects) params.append('region', value);
  for (const value of filters.cities) params.append('city', value);
  for (const value of filters.points) params.append('point', value);
  for (const value of filters.skus) params.append('sku', value);

  return params;
}

export function searchParamsToFilters(search: string): FilterState {
  const params = new URLSearchParams(search);

  return {
    periodPreset: parsePreset(params.get('preset')),
    dateFrom: parseMonth(params.get('from')),
    dateTo: parseMonth(params.get('to')),
    networks: params.getAll('network'),
    federalSubjects: params.getAll('region'),
    cities: params.getAll('city'),
    points: params.getAll('point'),
    skus: params.getAll('sku'),
  };
}

export function isDefaultFilters(filters: FilterState): boolean {
  return (
    filters.periodPreset === DEFAULT_FILTERS.periodPreset &&
    filters.dateFrom === DEFAULT_FILTERS.dateFrom &&
    filters.dateTo === DEFAULT_FILTERS.dateTo &&
    filters.networks.length === 0 &&
    filters.federalSubjects.length === 0 &&
    filters.cities.length === 0 &&
    filters.points.length === 0 &&
    filters.skus.length === 0
  );
}

const PRESERVED_PARAMS = ['tab'] as const;

function preserveExtraParams(params: URLSearchParams): void {
  const current = new URLSearchParams(window.location.search);
  for (const key of PRESERVED_PARAMS) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
}

export function buildFiltersShareUrl(filters: FilterState): string {
  const params = filtersToSearchParams(filters);
  preserveExtraParams(params);
  const qs = params.toString();
  const base = window.location.origin + window.location.pathname;
  return qs ? `${base}?${qs}` : base;
}

export function syncFiltersToUrl(filters: FilterState): void {
  const params = filtersToSearchParams(filters);
  preserveExtraParams(params);
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  const current = window.location.pathname + window.location.search;

  if (current !== next) {
    window.history.replaceState(null, '', next);
  }
}

export function readFiltersFromUrl(): FilterState {
  return searchParamsToFilters(window.location.search);
}
