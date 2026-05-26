import { useMemo } from 'react';
import type { DashboardAnalytics } from '../types/analytics';
import type { FilterState, PivotHierarchyOrder } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import { THRESHOLDS } from '../constants/thresholds';
import {
  aggregateMonthly,
  aggregateNetworks,
  aggregateByKey,
  buildPointMetrics,
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
} from '../utils/filters';

export function useDashboardAnalytics(
  records: SalesRecord[],
  filters: FilterState,
  pivotOrder: PivotHierarchyOrder = 'region-only',
): DashboardAnalytics & { filterOptions: ReturnType<typeof getFilterOptions>; hasData: boolean } {
  return useMemo(() => {
    const filterOptions = getFilterOptions(records, filters);
    const dateBounds = {
      minDate: filterOptions.minDate,
      maxDate: filterOptions.maxDate,
    };

    const filtered = filterRecords(records, filters, dateBounds);
    const withoutPeriod = filterRecordsWithoutPeriod(records, filters);
    const period = getEffectivePeriod(filters, dateBounds);
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
    const pointMetrics = buildPointMetrics(current, previous, totalSales);

    const topPoints = [...pointMetrics]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, THRESHOLDS.topPointsCount);

    const splitByNetwork = aggregateSplitSeries(current, 'network');
    const splitByRegion = aggregateSplitSeries(current, 'region');
    const { months: pivotMonths, tree: pivotTree } = buildPivotTable(
      current,
      pivotOrder,
      undefined,
      withoutPeriod,
    );

    return {
      kpi,
      monthlySales,
      avgMonthlySales,
      networkSales,
      regionSales,
      topPoints,
      splitByNetwork,
      splitByRegion,
      pivotMonths,
      pivotTree,
      currentRecords: current,
      dateRange: dateBounds.minDate
        ? { from: dateBounds.minDate, to: dateBounds.maxDate }
        : null,
      filteredRowCount: filtered.length,
      filterOptions,
      hasData,
    };
  }, [records, filters, pivotOrder]);
}
