import { useDeferredValue, useMemo } from 'react';
import type { DashboardAnalytics } from '../types/analytics';
import type { FilterState, PivotHierarchyOrder } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import {
  aggregatePeriodSales,
  aggregateNetworks,
  calcAvgMonthly,
  calcKpi,
  splitByPeriod,
  sumSales,
} from '../utils/analytics';
import {
  aggregateSplitSeries,
  aggregateSubjects,
  buildPivotTable,
  calcSequentialPeriodChangeFromMap,
  calcYoyChangeFromMap,
  enrichMonthlyWithYoy,
} from '../utils/pivotTable';
import { scanRecordsForDashboard } from '../utils/recordScan';
import type { DateBounds } from '../utils/periodBounds';

export function useDashboardAnalytics(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: DateBounds,
  pivotOrder: PivotHierarchyOrder = 'region-only',
): DashboardAnalytics & { filterOptions: ReturnType<typeof scanRecordsForDashboard>['filterOptions']; hasData: boolean } {
  const deferredFilters = useDeferredValue(filters);

  const scan = useMemo(
    () => scanRecordsForDashboard(records, deferredFilters, dateBounds),
    [records, deferredFilters, dateBounds],
  );

  const deferredScan = useDeferredValue(scan);

  const core = useMemo(() => {
    const { current, withoutPeriod, periodTotalsWithoutPeriod, allPeriodTotalsMap, period } =
      scan;
    const grouping = deferredFilters.timeGrouping;
    const { previous } = splitByPeriod(current, period);

    const totalSales = sumSales(current);
    const hasData = totalSales > 0 || current.length > 0;

    const monthlyRaw = aggregatePeriodSales(current, grouping);
    const monthlySales = enrichMonthlyWithYoy(monthlyRaw, allPeriodTotalsMap, grouping);
    const avgMonthlySales = calcAvgMonthly(monthlyRaw);

    const emptyChange = {
      changeAbs: 0,
      changePct: null,
      hasBase: false,
      lastMonthLabel: null,
      previousMonthLabel: null,
    };

    const momChange = period.to
      ? calcSequentialPeriodChangeFromMap(periodTotalsWithoutPeriod, period.to, grouping)
      : emptyChange;
    const yoyChange = period.to
      ? calcYoyChangeFromMap(periodTotalsWithoutPeriod, period.to, grouping)
      : emptyChange;

    const kpi = calcKpi(current, momChange, yoyChange);
    const networkSales = aggregateNetworks(current, previous, totalSales);
    const regionSales = aggregateSubjects(current, previous, totalSales);
    const splitByNetwork = aggregateSplitSeries(current, 'network', grouping);
    const splitByRegion = aggregateSplitSeries(current, 'region', grouping);

    return {
      kpi,
      monthlySales,
      timeGrouping: grouping,
      avgMonthlySales,
      networkSales,
      regionSales,
      topPoints: [],
      splitByNetwork,
      splitByRegion,
      currentRecords: current,
      withoutPeriod,
      dateRange: dateBounds.minDate ? { from: dateBounds.minDate, to: dateBounds.maxDate } : null,
      filteredRowCount: current.length,
      hasData,
    };
  }, [scan, deferredFilters.timeGrouping, dateBounds]);

  const { pivotMonths, pivotTree } = useMemo(() => {
    if (!core.hasData) {
      return { pivotMonths: [] as string[], pivotTree: [] };
    }
    const built = buildPivotTable(
      deferredScan.current,
      pivotOrder,
      undefined,
      deferredScan.withoutPeriod,
      core.timeGrouping,
    );
    return { pivotMonths: built.months, pivotTree: built.tree };
  }, [
    deferredScan.current,
    deferredScan.withoutPeriod,
    core.hasData,
    core.timeGrouping,
    pivotOrder,
  ]);

  const { withoutPeriod: _yoySource, ...analytics } = core;

  return {
    ...analytics,
    pivotMonths,
    pivotTree,
    filterOptions: scan.filterOptions,
  };
}
