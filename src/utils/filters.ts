import type { FilterState, FilterOptions } from '../types/filters';
import { PERIOD_PRESET_LABELS } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import { getPeriodRange, monthKeyInRange } from './dateUtils';
import { formatPointLabel } from './formatters';
import { matchesGeoFilters, toFilterSets } from './filterSets';

export interface DateBounds {
  minDate: string;
  maxDate: string;
}

export function resolvePeriodBounds(
  filters: FilterState,
  dateBounds: DateBounds,
): { from: string; to: string } {
  const { minDate, maxDate } = dateBounds;

  if (filters.periodPreset === 'all' && !filters.dateFrom && !filters.dateTo) {
    return { from: minDate, to: maxDate };
  }

  if (filters.dateFrom || filters.dateTo) {
    return {
      from: filters.dateFrom ?? minDate,
      to: filters.dateTo ?? maxDate,
    };
  }

  return getPeriodRange(filters.periodPreset, minDate, maxDate);
}

export function filterRecords(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
): SalesRecord[] {
  const period = resolvePeriodBounds(filters, dateBounds);
  const sets = toFilterSets(filters);
  const result: SalesRecord[] = [];

  for (const r of records) {
    if (!monthKeyInRange(r.monthKey, period.from, period.to)) continue;
    if (!matchesGeoFilters(r, sets)) continue;
    result.push(r);
  }

  return result;
}

export function filterRecordsWithoutPeriod(
  records: SalesRecord[],
  filters: FilterState,
): SalesRecord[] {
  const sets = toFilterSets(filters);
  const result: SalesRecord[] = [];

  for (const r of records) {
    if (!matchesGeoFilters(r, sets)) continue;
    result.push(r);
  }

  return result;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'ru'));
}

/** One pass over records instead of re-filtering the full dataset per dimension */
export function getFilterOptions(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
): FilterOptions {
  const sets = toFilterSets(filters);
  const networks = new Set<string>();
  const cities = new Set<string>();
  const federalSubjects = new Set<string>();
  const skus = new Set<string>();
  const pointMap = new Map<string, string>();

  for (const r of records) {
    if (matchesGeoFilters(r, sets, 'networks')) networks.add(r.network);
    if (matchesGeoFilters(r, sets, 'cities')) cities.add(r.city);
    if (matchesGeoFilters(r, sets, 'federalSubjects')) federalSubjects.add(r.federalSubject);
    if (matchesGeoFilters(r, sets, 'skus')) skus.add(r.sku);
    if (matchesGeoFilters(r, sets, 'points')) {
      if (!pointMap.has(r.pointId)) {
        pointMap.set(r.pointId, formatPointLabel(r.network, r.city, r.address));
      }
    }
  }

  const points = [...pointMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return {
    networks: sortStrings(networks),
    cities: sortStrings(cities),
    federalSubjects: sortStrings(federalSubjects),
    points,
    skus: sortStrings(skus),
    minDate: dateBounds.minDate,
    maxDate: dateBounds.maxDate,
  };
}

export function getActiveFilterSummary(
  filters: FilterState,
): string[] {
  const parts: string[] = [];

  if (filters.periodPreset !== 'all') {
    parts.push(PERIOD_PRESET_LABELS[filters.periodPreset]);
  } else if (filters.dateFrom && filters.dateTo) {
    parts.push(`${filters.dateFrom} — ${filters.dateTo}`);
  }

  filters.networks.forEach((n) => parts.push(n));
  filters.cities.forEach((c) => parts.push(c));
  filters.federalSubjects.forEach((s) => parts.push(s));
  if (filters.points.length) {
    parts.push(`${filters.points.length} точек`);
  }
  if (filters.skus.length) {
    parts.push(filters.skus.length === 1 ? filters.skus[0] : `${filters.skus.length} SKU`);
  }

  return parts;
}

export function getEffectivePeriod(
  filters: FilterState,
  dateBounds: DateBounds,
): { from: string; to: string } {
  return resolvePeriodBounds(filters, dateBounds);
}
