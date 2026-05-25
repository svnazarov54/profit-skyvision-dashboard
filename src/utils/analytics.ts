import type {
  AggregatedEntity,
  ChangeMetrics,
  GrowthStatus,
  MonthlySales,
  PointMetrics,
  SalesRecord,
} from '../types/sales';
import type { KpiData } from '../types/analytics';
import type { MomChange } from '../types/analytics';
import { THRESHOLDS } from '../constants/thresholds';
import {
  formatMonthLabel,
  getPreviousMonthKey,
  getPreviousPeriodRange,
} from './dateUtils';

export function calcChange(current: number, previous: number): ChangeMetrics {
  if (previous === 0) {
    return { changeAbs: current - previous, changePct: null };
  }
  const changeAbs = current - previous;
  return {
    changeAbs,
    changePct: (changeAbs / previous) * 100,
  };
}

export function getGrowthStatus(changePct: number | null): GrowthStatus {
  if (changePct === null) return 'Нет базы';
  if (changePct > THRESHOLDS.statusGrowth) return 'Рост';
  if (changePct >= -THRESHOLDS.statusStable) return 'Стабильно';
  if (changePct > THRESHOLDS.anomalyCritical) return 'Спад';
  return 'Критический спад';
}

export function sumSales(records: SalesRecord[]): number {
  return records.reduce((sum, r) => sum + r.salesCount, 0);
}

export function aggregateByKey(
  records: SalesRecord[],
  keyFn: (r: SalesRecord) => string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of records) {
    const key = keyFn(r);
    map.set(key, (map.get(key) ?? 0) + r.salesCount);
  }
  return map;
}

export function aggregateMonthly(records: SalesRecord[]): MonthlySales[] {
  const map = aggregateByKey(records, (r) => r.monthKey);
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([monthKey, sales], index) => {
    const prev = index > 0 ? sorted[index - 1][1] : null;
    const change =
      prev !== null ? calcChange(sales, prev) : { changeAbs: null, changePct: null };

    return {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      sales,
      changeAbs: change.changeAbs as number | null,
      changePct: change.changePct,
    };
  });
}

function aggregateEntitiesWithChange(
  currentMap: Map<string, number>,
  previousMap: Map<string, number>,
  totalSales: number,
): AggregatedEntity[] {
  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);

  return [...allKeys]
    .map((name) => {
      const sales = currentMap.get(name) ?? 0;
      const prev = previousMap.get(name) ?? 0;
      const { changeAbs, changePct } = calcChange(sales, prev);
      return {
        name,
        sales,
        sharePct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
        changeAbs,
        changePct,
      };
    })
    .sort((a, b) => b.sales - a.sales);
}

export function aggregateNetworks(
  current: SalesRecord[],
  previous: SalesRecord[],
  totalSales: number,
): AggregatedEntity[] {
  return aggregateEntitiesWithChange(
    aggregateByKey(current, (r) => r.network),
    aggregateByKey(previous, (r) => r.network),
    totalSales,
  );
}

export function aggregateCities(
  current: SalesRecord[],
  previous: SalesRecord[],
  totalSales: number,
): AggregatedEntity[] {
  const currentMap = aggregateByKey(current, (r) => r.city);
  const previousMap = aggregateByKey(previous, (r) => r.city);

  let entities = aggregateEntitiesWithChange(currentMap, previousMap, totalSales);

  if (entities.length > THRESHOLDS.maxCitiesBeforeOthers) {
    const top = entities.slice(0, THRESHOLDS.topCitiesLimit);
    const rest = entities.slice(THRESHOLDS.topCitiesLimit);
    const othersSales = rest.reduce((s, e) => s + e.sales, 0);
    const othersPrev = rest.reduce((s, e) => {
      const prev = previousMap.get(e.name) ?? 0;
      return s + prev;
    }, 0);
    const { changeAbs, changePct } = calcChange(othersSales, othersPrev);

    top.push({
      name: 'Другие',
      sales: othersSales,
      sharePct: totalSales > 0 ? (othersSales / totalSales) * 100 : 0,
      changeAbs,
      changePct,
    });
    entities = top;
  }

  return entities;
}

export interface PointMeta {
  network: string;
  city: string;
  fullCity: string;
  federalSubject: string;
  address: string;
}

export function buildPointMetrics(
  current: SalesRecord[],
  previous: SalesRecord[],
  totalSales: number,
): PointMetrics[] {
  const metaMap = new Map<string, PointMeta>();
  for (const r of current) {
    if (!metaMap.has(r.pointId)) {
      metaMap.set(r.pointId, {
        network: r.network,
        city: r.city,
        fullCity: r.fullCity,
        federalSubject: r.federalSubject,
        address: r.address,
      });
    }
  }
  for (const r of previous) {
    if (!metaMap.has(r.pointId)) {
      metaMap.set(r.pointId, {
        network: r.network,
        city: r.city,
        fullCity: r.fullCity,
        federalSubject: r.federalSubject,
        address: r.address,
      });
    }
  }

  const currentMap = aggregateByKey(current, (r) => r.pointId);
  const previousMap = aggregateByKey(previous, (r) => r.pointId);
  const allIds = new Set([...currentMap.keys(), ...previousMap.keys()]);

  return [...allIds].map((pointId) => {
    const meta = metaMap.get(pointId)!;
    const sales = currentMap.get(pointId) ?? 0;
    const prev = previousMap.get(pointId) ?? 0;
    const { changeAbs, changePct } = calcChange(sales, prev);

    return {
      pointId,
      ...meta,
      sales,
      sharePct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      changeAbs,
      changePct,
      status: getGrowthStatus(changePct),
    };
  });
}

export function calcKpi(
  current: SalesRecord[],
  momChange: MomChange,
): KpiData {
  const totalSales = sumSales(current);

  const networkMap = aggregateByKey(current, (r) => r.network);
  let bestNetwork: KpiData['bestNetwork'] = null;
  let maxNetworkSales = 0;
  for (const [name, sales] of networkMap) {
    if (sales > maxNetworkSales) {
      maxNetworkSales = sales;
      bestNetwork = {
        name,
        sales,
        sharePct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      };
    }
  }

  const regionMap = aggregateByKey(current, (r) => r.federalSubject);
  let bestRegion: KpiData['bestRegion'] = null;
  let maxRegionSales = 0;
  for (const [name, sales] of regionMap) {
    if (sales > maxRegionSales) {
      maxRegionSales = sales;
      bestRegion = {
        name,
        sales,
        sharePct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      };
    }
  }

  return {
    totalSales,
    momChange,
    bestNetwork,
    bestRegion,
  };
}

export function splitByPeriod(
  records: SalesRecord[],
  period: { from: string; to: string },
): { current: SalesRecord[]; previous: SalesRecord[] } {
  if (!period.from || !period.to) {
    return { current: [], previous: [] };
  }

  const prevRange = getPreviousPeriodRange(period.from, period.to);

  const current = records.filter(
    (r) => r.monthKey >= period.from && r.monthKey <= period.to,
  );
  const previous =
    prevRange.from && prevRange.to
      ? records.filter(
          (r) => r.monthKey >= prevRange.from && r.monthKey <= prevRange.to,
        )
      : [];

  return { current, previous };
}

export function findPeakAndTrough(monthly: MonthlySales[]): {
  peak: MonthlySales | null;
  trough: MonthlySales | null;
} {
  if (!monthly.length) return { peak: null, trough: null };

  let peak = monthly[0];
  let trough = monthly[0];

  for (const m of monthly) {
    if (m.sales > peak.sales) peak = m;
    if (m.sales < trough.sales) trough = m;
  }

  return { peak, trough };
}

export function calcAvgMonthly(monthly: MonthlySales[]): number {
  if (!monthly.length) return 0;
  return monthly.reduce((s, m) => s + m.sales, 0) / monthly.length;
}

export function getLastTwoMonths(monthly: MonthlySales[]): {
  last: MonthlySales | null;
  previous: MonthlySales | null;
} {
  if (monthly.length < 2) {
    return { last: monthly[monthly.length - 1] ?? null, previous: null };
  }
  return {
    last: monthly[monthly.length - 1],
    previous: monthly[monthly.length - 2],
  };
}

export { getPreviousMonthKey };
