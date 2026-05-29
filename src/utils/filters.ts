import type { FilterState, FilterOptions } from '../types/filters';
import { PERIOD_PRESET_LABELS } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import { monthKeyInRange } from './dateUtils';
import { resolvePeriodBounds, type DateBounds } from './periodBounds';
import { scanRecordsForDashboard } from './recordScan';
import { matchesGeoFilters, toFilterSets } from './filterSets';

export type { DateBounds } from './periodBounds';
export { resolvePeriodBounds } from './periodBounds';

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

/** @deprecated Prefer scanRecordsForDashboard for combined filtering + options */
export function getFilterOptions(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
): FilterOptions {
  const { filterOptions } = scanRecordsForDashboard(records, filters, dateBounds);
  return filterOptions;
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

  filters.brands.forEach((b) => parts.push(b));
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
