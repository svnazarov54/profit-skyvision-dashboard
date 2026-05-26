import type { SalesRecord } from '../types/sales';
import type { MomChange, MonthlySalesWithYoy, PivotLevel, PivotNode, SplitSeries } from '../types/analytics';
import type { PivotHierarchyOrder } from '../types/filters';
import { THRESHOLDS } from '../constants/thresholds';
import { formatMonthLabel, getPreviousMonthKey } from './dateUtils';
import { formatPointLabel } from './formatters';
import {
  aggregateByKey,
  aggregateMonthly,
  calcChange,
  sumSales,
} from './analytics';

export function getYoYMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${Number(year) - 1}-${month}`;
}

export function enrichMonthlyWithYoy(
  monthly: ReturnType<typeof aggregateMonthly>,
  allMonthlyMap: Map<string, number>,
): MonthlySalesWithYoy[] {
  return monthly.map((m) => {
    const yoyKey = getYoYMonthKey(m.monthKey);
    const yoySales = allMonthlyMap.get(yoyKey) ?? null;
    const yoyChangePct =
      yoySales !== null && yoySales > 0
        ? ((m.sales - yoySales) / yoySales) * 100
        : null;

    return {
      ...m,
      yoySales,
      yoyChangePct,
    };
  });
}

export function calcMomChange(
  records: SalesRecord[],
  periodTo: string,
): MomChange {
  const monthlyMap = aggregateByKey(records, (r) => r.monthKey);
  const lastMonthKey = periodTo;
  const prevMonthKey = getPreviousMonthKey(lastMonthKey);

  const lastSales = monthlyMap.get(lastMonthKey) ?? 0;
  const prevSales = monthlyMap.get(prevMonthKey) ?? 0;
  const { changeAbs, changePct } = calcChange(lastSales, prevSales);

  return {
    changeAbs,
    changePct,
    hasBase: prevSales > 0,
    lastMonthLabel: lastMonthKey ? formatMonthLabel(lastMonthKey) : null,
    previousMonthLabel: prevMonthKey ? formatMonthLabel(prevMonthKey) : null,
  };
}

export function calcYoyChange(
  records: SalesRecord[],
  periodTo: string,
): MomChange {
  const monthlyMap = aggregateByKey(records, (r) => r.monthKey);
  const lastMonthKey = periodTo;
  const yoyKey = getYoYMonthKey(lastMonthKey);

  const lastSales = monthlyMap.get(lastMonthKey) ?? 0;
  const yoySales = monthlyMap.get(yoyKey) ?? 0;
  const { changeAbs, changePct } = calcChange(lastSales, yoySales);

  return {
    changeAbs,
    changePct,
    hasBase: yoySales > 0,
    lastMonthLabel: lastMonthKey ? formatMonthLabel(lastMonthKey) : null,
    previousMonthLabel: yoyKey ? formatMonthLabel(yoyKey) : null,
  };
}

export function calcMonthMomPct(
  monthly: Record<string, number>,
  monthKey: string,
  months: string[],
): number | null {
  const idx = months.indexOf(monthKey);
  if (idx <= 0) return null;
  const prevKey = months[idx - 1];
  const cur = monthly[monthKey] ?? 0;
  const prev = monthly[prevKey] ?? 0;
  if (!cur || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function calcMonthYoyPct(
  periodMonthly: Record<string, number>,
  yoyBaseline: Record<string, number>,
  monthKey: string,
): number | null {
  const yoyKey = getYoYMonthKey(monthKey);
  const cur = periodMonthly[monthKey] ?? 0;
  const yoy = yoyBaseline[yoyKey];
  if (!cur || yoy === undefined || yoy <= 0) return null;
  return ((cur - yoy) / yoy) * 100;
}

export function aggregateSubjects(
  current: SalesRecord[],
  previous: SalesRecord[],
  totalSales: number,
) {
  const currentMap = aggregateByKey(current, (r) => r.federalSubject);
  const previousMap = aggregateByKey(previous, (r) => r.federalSubject);
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

const SPLIT_COLORS = [
  '#2563EB', '#16A34A', '#F97316', '#DC2626', '#8B5CF6',
  '#0891B2', '#CA8A04', '#DB2777', '#059669', '#7C3AED',
  '#EA580C', '#0284C7',
];

export function getSplitColor(index: number): string {
  return SPLIT_COLORS[index % SPLIT_COLORS.length];
}

export function aggregateSplitSeries(
  records: SalesRecord[],
  dimension: 'network' | 'region',
  maxSeries = 12,
): SplitSeries[] {
  const keyFn =
    dimension === 'network'
      ? (r: SalesRecord) => r.network
      : (r: SalesRecord) => r.federalSubject;

  const groupMonth = new Map<string, Map<string, number>>();

  for (const r of records) {
    const group = keyFn(r);
    if (!groupMonth.has(group)) groupMonth.set(group, new Map());
    const monthMap = groupMonth.get(group)!;
    monthMap.set(r.monthKey, (monthMap.get(r.monthKey) ?? 0) + r.salesCount);
  }

  const totals = [...groupMonth.entries()]
    .map(([name, monthMap]) => ({
      name,
      total: [...monthMap.values()].reduce((s, v) => s + v, 0),
      monthMap,
    }))
    .sort((a, b) => b.total - a.total);

  const top = totals.slice(0, maxSeries);
  const rest = totals.slice(maxSeries);

  const series: SplitSeries[] = top.map(({ name, total, monthMap }) => ({
    name,
    total,
    points: [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, sales]) => ({ monthKey, sales })),
  }));

  if (rest.length > 0) {
    const othersMap = new Map<string, number>();
    for (const { monthMap } of rest) {
      for (const [monthKey, sales] of monthMap) {
        othersMap.set(monthKey, (othersMap.get(monthKey) ?? 0) + sales);
      }
    }
    series.push({
      name: 'Другие',
      total: rest.reduce((s, r) => s + r.total, 0),
      points: [...othersMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, sales]) => ({ monthKey, sales })),
    });
  }

  return series;
}

const LEVEL_GETTERS: Record<PivotLevel, { key: (r: SalesRecord) => string; label: (r: SalesRecord, key: string) => string }> = {
  network: {
    key: (r) => r.network,
    label: (_r, key) => key,
  },
  region: {
    key: (r) => r.federalSubject,
    label: (_r, key) => key,
  },
  city: {
    key: (r) => r.city,
    label: (_r, key) => key,
  },
  pharmacy: {
    key: (r) => r.pointId,
    label: (r) => formatPointLabel(r.network, r.city, r.address),
  },
};

function getHierarchyLevels(
  order: PivotHierarchyOrder,
  selectedLevels?: PivotLevel[],
): PivotLevel[] {
  const full: PivotLevel[] =
    order === 'region-only'
      ? ['region', 'city', 'pharmacy']
      : order === 'network-first'
        ? ['network', 'region', 'city', 'pharmacy']
        : ['region', 'network', 'city', 'pharmacy'];

  if (!selectedLevels?.length) return full;
  return full.filter((l) => selectedLevels.includes(l));
}

export function getOrderedPivotLevels(order: PivotHierarchyOrder): PivotLevel[] {
  if (order === 'region-only') return ['region', 'city', 'pharmacy'];
  return order === 'network-first'
    ? ['network', 'region', 'city', 'pharmacy']
    : ['region', 'network', 'city', 'pharmacy'];
}

export const PIVOT_LEVEL_LABELS: Record<PivotLevel, string> = {
  network: 'Сеть',
  region: 'Субъект РФ',
  city: 'Город',
  pharmacy: 'Аптека',
};

function buildMonthlyMap(records: SalesRecord[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of records) {
    map[r.monthKey] = (map[r.monthKey] ?? 0) + r.salesCount;
  }
  return map;
}

/** YoY baseline months for visible period — always from data without period filter */
function buildYoyBaselineMap(
  records: SalesRecord[],
  displayMonths: string[],
): Record<string, number> {
  const yoyKeys = new Set(displayMonths.map(getYoYMonthKey));
  const map: Record<string, number> = {};
  for (const r of records) {
    if (yoyKeys.has(r.monthKey)) {
      map[r.monthKey] = (map[r.monthKey] ?? 0) + r.salesCount;
    }
  }
  return map;
}

function groupYoyByKey(
  scopedYoy: SalesRecord[] | undefined,
  level: PivotLevel,
): Map<string, SalesRecord[]> | undefined {
  if (!scopedYoy?.length) return undefined;

  const getter = LEVEL_GETTERS[level];
  const byKey = new Map<string, SalesRecord[]>();
  for (const r of scopedYoy) {
    const key = getter.key(r);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }
  return byKey;
}

function buildPivotLevel(
  records: SalesRecord[],
  levels: PivotLevel[],
  pathPrefix: string,
  scopedYoy: SalesRecord[] | undefined,
  displayMonths: string[],
): PivotNode[] {
  if (!levels.length || !records.length) return [];

  const level = levels[0];
  const getter = LEVEL_GETTERS[level];
  const groups = new Map<string, SalesRecord[]>();
  const yoyByKey = groupYoyByKey(scopedYoy, level);

  for (const r of records) {
    const key = getter.key(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return [...groups.entries()]
    .map(([key, groupRecords]) => {
      const branchYoy = yoyByKey?.get(key);
      const monthly = buildMonthlyMap(groupRecords);
      const yoyMonthly =
        branchYoy?.length && displayMonths.length
          ? buildYoyBaselineMap(branchYoy, displayMonths)
          : {};
      const total = sumSales(groupRecords);
      const sample = groupRecords[0];
      const id = `${pathPrefix}/${level}:${key}`;

      return {
        id,
        label: getter.label(sample, key),
        level,
        monthly,
        yoyMonthly,
        total,
        children: buildPivotLevel(
          groupRecords,
          levels.slice(1),
          id,
          branchYoy,
          displayMonths,
        ),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function buildPivotTable(
  records: SalesRecord[],
  order: PivotHierarchyOrder,
  selectedLevels?: PivotLevel[],
  yoyRecords?: SalesRecord[],
): { months: string[]; tree: PivotNode[] } {
  const monthSet = new Set<string>();
  for (const r of records) monthSet.add(r.monthKey);
  const months = [...monthSet].sort();
  const levels = getHierarchyLevels(order, selectedLevels);
  const tree = levels.length ? buildPivotLevel(records, levels, 'root', yoyRecords, months) : [];
  return { months, tree };
}

export function flattenPivotRows(
  nodes: PivotNode[],
  expanded: Set<string>,
  depth = 0,
): Array<PivotNode & { depth: number }> {
  return flattenPivotRowsSorted(nodes, expanded, 'total', 'desc', [], depth);
}

export type PivotMonthMetric = 'value' | 'mom' | 'yoy';
export type PivotSortKey = 'name' | 'total' | 'mom' | string;
export type PivotSortDir = 'asc' | 'desc';

export function pivotMonthSortKey(month: string, metric: PivotMonthMetric): string {
  return `${month}:${metric}`;
}

export function parsePivotMonthSortKey(
  sortKey: string,
): { month: string; metric: PivotMonthMetric } | null {
  const match = sortKey.match(/^(\d{4}-\d{2}):(value|mom|yoy)$/);
  if (!match) return null;
  return { month: match[1], metric: match[2] as PivotMonthMetric };
}

function getNodeSortValue(
  node: PivotNode,
  sortKey: PivotSortKey,
  months: string[],
): number | string {
  if (sortKey === 'name') return node.label.toLowerCase();
  if (sortKey === 'total') return node.total;
  if (sortKey === 'mom') {
    if (months.length < 2) return -Infinity;
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const l = node.monthly[last] ?? 0;
    const p = node.monthly[prev] ?? 0;
    if (p === 0) return -Infinity;
    return ((l - p) / p) * 100;
  }

  const monthMetric = parsePivotMonthSortKey(sortKey);
  if (monthMetric) {
    const { month, metric } = monthMetric;
    if (metric === 'value') return node.monthly[month] ?? 0;
    if (metric === 'mom') {
      return calcMonthMomPct(node.monthly, month, months) ?? -Infinity;
    }
    return calcMonthYoyPct(node.monthly, node.yoyMonthly, month) ?? -Infinity;
  }

  if (/^\d{4}-\d{2}$/.test(sortKey)) {
    return node.monthly[sortKey] ?? 0;
  }

  return node.monthly[sortKey] ?? 0;
}

function compareNodes(
  a: PivotNode,
  b: PivotNode,
  sortKey: PivotSortKey,
  months: string[],
): number {
  const va = getNodeSortValue(a, sortKey, months);
  const vb = getNodeSortValue(b, sortKey, months);
  if (typeof va === 'string' && typeof vb === 'string') {
    return va.localeCompare(vb, 'ru');
  }
  return Number(va) - Number(vb);
}

function sortSiblings(
  nodes: PivotNode[],
  sortKey: PivotSortKey,
  sortDir: PivotSortDir,
  months: string[],
): PivotNode[] {
  return [...nodes].sort((a, b) => {
    const cmp = compareNodes(a, b, sortKey, months);
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

/** Flatten tree preserving hierarchy; sorts siblings only (not global flat sort). */
export function flattenPivotRowsSorted(
  nodes: PivotNode[],
  expanded: Set<string>,
  sortKey: PivotSortKey,
  sortDir: PivotSortDir,
  months: string[],
  depth = 0,
): Array<PivotNode & { depth: number }> {
  const rows: Array<PivotNode & { depth: number }> = [];
  const sorted = sortSiblings(nodes, sortKey, sortDir, months);

  for (const node of sorted) {
    rows.push({ ...node, depth });
    if (expanded.has(node.id) && node.children.length > 0) {
      rows.push(
        ...flattenPivotRowsSorted(
          node.children,
          expanded,
          sortKey,
          sortDir,
          months,
          depth + 1,
        ),
      );
    }
  }

  return rows;
}

export function computeGrandTotal(
  tree: PivotNode[],
  months: string[],
): { monthly: Record<string, number>; yoyMonthly: Record<string, number>; total: number } {
  const monthly: Record<string, number> = {};
  const yoyMonthly: Record<string, number> = {};
  let total = 0;
  for (const node of tree) {
    total += node.total;
    for (const m of months) {
      monthly[m] = (monthly[m] ?? 0) + (node.monthly[m] ?? 0);
    }
    for (const [key, sales] of Object.entries(node.yoyMonthly)) {
      yoyMonthly[key] = (yoyMonthly[key] ?? 0) + sales;
    }
  }
  return { monthly, yoyMonthly, total };
}

export { THRESHOLDS };
