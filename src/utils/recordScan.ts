import type { FilterOptions, FilterState } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import { formatPointLabel } from './formatters';
import { monthKeyInRange } from './dateUtils';
import { resolvePeriodBounds, type DateBounds } from './periodBounds';
import { matchesGeoFilters, toFilterSets } from './filterSets';
import { monthKeyToPeriodKey } from './periodGrouping';

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'ru'));
}

/** Single pass over all records: filters, filter options, period totals for YoY KPI */
export interface DashboardScanResult {
  current: SalesRecord[];
  withoutPeriod: SalesRecord[];
  /** Aggregated sales by period key (geo-filtered, any date) — for KPI MoM/QoQ/YoY */
  periodTotalsWithoutPeriod: Map<string, number>;
  /** Same data keyed by period — for chart YoY enrichment */
  allPeriodTotalsMap: Map<string, number>;
  filterOptions: FilterOptions;
  period: { from: string; to: string };
}

export function scanRecordsForDashboard(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
): DashboardScanResult {
  const period = resolvePeriodBounds(filters, dateBounds);
  const sets = toFilterSets(filters);
  const grouping = filters.timeGrouping;

  const brands = new Set<string>();
  const networks = new Set<string>();
  const cities = new Set<string>();
  const federalSubjects = new Set<string>();
  const skus = new Set<string>();
  const pointMap = new Map<string, string>();

  const current: SalesRecord[] = [];
  const withoutPeriod: SalesRecord[] = [];
  const periodTotalsWithoutPeriod = new Map<string, number>();
  const allPeriodTotalsMap = periodTotalsWithoutPeriod;

  for (const r of records) {
    if (matchesGeoFilters(r, sets, 'brands')) brands.add(r.product);
    if (matchesGeoFilters(r, sets, 'networks')) networks.add(r.network);
    if (matchesGeoFilters(r, sets, 'cities')) cities.add(r.city);
    if (matchesGeoFilters(r, sets, 'federalSubjects')) federalSubjects.add(r.federalSubject);
    if (matchesGeoFilters(r, sets, 'skus')) skus.add(r.sku);
    if (matchesGeoFilters(r, sets, 'points')) {
      if (!pointMap.has(r.pointId)) {
        pointMap.set(r.pointId, formatPointLabel(r.network, r.city, r.address));
      }
    }

    if (!matchesGeoFilters(r, sets)) continue;

    withoutPeriod.push(r);
    const periodKey = monthKeyToPeriodKey(r.monthKey, grouping);
    periodTotalsWithoutPeriod.set(
      periodKey,
      (periodTotalsWithoutPeriod.get(periodKey) ?? 0) + r.salesCount,
    );

    if (monthKeyInRange(r.monthKey, period.from, period.to)) {
      current.push(r);
    }
  }

  const points = [...pointMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return {
    current,
    withoutPeriod,
    periodTotalsWithoutPeriod,
    filterOptions: {
      brands: sortStrings(brands),
      networks: sortStrings(networks),
      cities: sortStrings(cities),
      federalSubjects: sortStrings(federalSubjects),
      points,
      skus: sortStrings(skus),
      minDate: dateBounds.minDate,
      maxDate: dateBounds.maxDate,
    },
    period,
    allPeriodTotalsMap,
  };
}
