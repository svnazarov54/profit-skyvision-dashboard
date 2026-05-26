import { useDeferredValue, useMemo } from 'react';
import type { DashboardAnalytics } from '../types/analytics';
import type { FilterState, PivotHierarchyOrder } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import {
  aggregateMonthly,
  aggregateNetworks,
  aggregateByKey,
  calcAvgMonthly,
  calcKpi,
  splitByPeriod,
  sumSales,
} from '../utils/analytics';
import {
  aggregateSplitSeries,
  aggregateSubjects,
  buildPivotTable,
  calcMomChange,
  calcYoyChange,
  enrichMonthlyWithYoy,
} from '../utils/pivotTable';
import {
  filterRecords,
  filterRecordsWithoutPeriod,
  getEffectivePeriod,
  getFilterOptions,
  type DateBounds,
} from '../utils/filters';

export function useDashboardAnalytics(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
  pivotOrder: PivotHierarchyOrder = 'region-only',
): DashboardAnalytics & { filterOptions: ReturnType<typeof getFilterOptions>; hasData: boolean } {
  const deferredFilters = useDeferredValue(filters);

  const filterOptions = useMemo(
    () => getFilterOptions(records, deferredFilters, dateBounds),
    [records, deferredFilters, dateBounds],
  );

  const core = useMemo(() => {
    const filtered = filterRecords(records, deferredFilters, dateBounds);
    const withoutPeriod = filterRecordsWithoutPeriod(records, deferredFilters);
    const period = getEffectivePeriod(deferredFilters, dateBounds);
    const { current, previous } = splitByPeriod(filtered, period);

    const totalSales = sumSales(current);
    const hasData = totalSales > 0 || current.length > 0;

    const monthlyRaw = aggregateMonthly(current);
    const allMonthlyMap = aggregateByKey(withoutPeriod, (r) => r.monthKey);
    const monthlySales = enrichMonthlyWithYoy(monthlyRaw, allMonthlyMap);
    const avgMonthlySales = calcAvgMonthly(monthlyRaw);

    const emptyChange = {
      changeAbs: 0,
      changePct: null,
      hasBase: false,
      lastMonthLabel: null,
      previousMonthLabel: null,
    };

    const momChange = period.to ? calcMomChange(withoutPeriod, period.to) : emptyChange;
    const yoyChange = period.to ? calcYoyChange(withoutPeriod, period.to) : emptyChange;

    const kpi = calcKpi(current, momChange, yoyChange);
    const networkSales = aggregateNetworks(current, previous, totalSales);
    const regionSales = aggregateSubjects(current, previous, totalSales);
    const splitByNetwork = aggregateSplitSeries(current, 'network');
    const splitByRegion = aggregateSplitSeries(current, 'region');

    return {
      kpi,
      monthlySales,
      avgMonthlySales,
      networkSales,
      regionSales,
      topPoints: [],
      splitByNetwork,
      splitByRegion,
      currentRecords: current,
      withoutPeriod,
      dateRange: dateBounds.minDate ? { from: dateBounds.minDate, to: dateBounds.maxDate } : null,
      filteredRowCount: filtered.length,
      hasData,
    };
  }, [records, deferredFilters, dateBounds]);

  const { pivotMonths, pivotTree } = useMemo(() => {
    if (!core.hasData) {
      return { pivotMonths: [] as string[], pivotTree: [] };
    }
    const built = buildPivotTable(core.currentRecords, pivotOrder, undefined, core.withoutPeriod);
    return { pivotMonths: built.months, pivotTree: built.tree };
  }, [core.currentRecords, core.withoutPeriod, core.hasData, pivotOrder]);

  const { withoutPeriod: _yoySource, ...analytics } = core;

  return {
    ...analytics,
    pivotMonths,
    pivotTree,
    filterOptions,
  };
}
