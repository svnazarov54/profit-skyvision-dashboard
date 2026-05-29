import * as XLSX from 'xlsx';
import type { PivotLevel, PivotNode } from '../types/analytics';
import type { TimeGrouping } from '../types/filters';
import { PIVOT_LEVEL_LABELS } from './pivotTable';
import { formatPeriodLabel } from './periodGrouping';

function getAllExpandableIds(tree: PivotNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: PivotNode[]) => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.add(node.id);
        walk(node.children);
      }
    }
  };
  walk(tree);
  return ids;
}

interface SheetRow {
  level: PivotLevel;
  path: Partial<Record<PivotLevel, string>>;
  monthly: Record<string, number>;
  total: number;
  outlineLevel: number;
}

function flattenTreeWithPathLimited(
  nodes: PivotNode[],
  path: Partial<Record<PivotLevel, string>>,
  expanded: Set<string>,
  dimensionLevels: PivotLevel[],
): SheetRow[] {
  const result: SheetRow[] = [];
  const targetLevel = dimensionLevels[dimensionLevels.length - 1];
  const indexByLevel = new Map<PivotLevel, number>(dimensionLevels.map((l, i) => [l, i]));

  for (const node of nodes) {
    const newPath = { ...path, [node.level]: node.label };
    const outlineLevel = indexByLevel.get(node.level) ?? -1;

    // Include only rows for selected levels.
    if (outlineLevel >= 0) {
      result.push({
        level: node.level,
        path: newPath,
        monthly: node.monthly,
        total: node.total,
        outlineLevel,
      });
    }

    // Stop descending beyond the deepest selected level (aggregation requirement).
    if (node.level === targetLevel) continue;

    if (expanded.has(node.id) && node.children.length > 0) {
      result.push(...flattenTreeWithPathLimited(node.children, newPath, expanded, dimensionLevels));
    }
  }

  return result;
}

const PERIOD_COLUMN_LABELS: Record<TimeGrouping, string> = {
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
};

export function exportPivotToExcel(
  tree: PivotNode[],
  months: string[],
  dimensionLevels: PivotLevel[],
  timeGrouping: TimeGrouping = 'month',
  _expanded?: Set<string>,
  filename = 'sales_pivot.xlsx',
): void {
  const safeLevels = dimensionLevels.length > 0 ? dimensionLevels : (['region'] as PivotLevel[]);
  const expanded = getAllExpandableIds(tree);
  const rows = flattenTreeWithPathLimited(tree, {}, expanded, safeLevels);
  const targetLevel = safeLevels[safeLevels.length - 1];

  const headers = [
    ...safeLevels.map((l) => PIVOT_LEVEL_LABELS[l]),
    ...months.map((m) => formatPeriodLabel(m, timeGrouping)),
    'Итого',
  ];

  const data = rows.map((row) => [
    ...safeLevels.map((l) => row.path[l] ?? ''),
    ...months.map((m) => row.monthly[m] ?? 0),
    row.total,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Basic readability tweaks (column widths).
  ws['!cols'] = [
    ...safeLevels.map((_, i) => ({ wch: i === 0 ? 18 : 28 })),
    ...months.map(() => ({ wch: 12 })),
    { wch: 12 },
  ];

  // Excel outline/grouping (so levels can be collapsed/expanded).
  // Header row is 0; data starts at row 1.
  ws['!rows'] = [{ level: 0 }, ...rows.map((r) => ({ level: Math.max(0, r.outlineLevel) }))];

  // Enable outlining summary above (standard pivot-like feel).
  ws['!outline'] = { above: true, left: true };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Продажи');

  // Pivot-ready (normalized) sheet for creating a real Excel PivotTable.
  // Important: only export deepest selected level rows to avoid duplicates
  // (e.g. "Москва" total row + pharmacies within Moscow).
  const pivotHeaders = [
    ...safeLevels.map((l) => PIVOT_LEVEL_LABELS[l]),
    PERIOD_COLUMN_LABELS[timeGrouping],
    'Продажи',
  ];
  const leafRows = rows.filter((r) => r.level === targetLevel);
  const pivotData = leafRows.flatMap((row) =>
    months.map((m) => [
      ...safeLevels.map((l) => row.path[l] ?? ''),
      formatPeriodLabel(m, timeGrouping),
      row.monthly[m] ?? 0,
    ]),
  );

  const wsPivot = XLSX.utils.aoa_to_sheet([pivotHeaders, ...pivotData]);
  wsPivot['!cols'] = [
    ...safeLevels.map((_, i) => ({ wch: i === 0 ? 18 : 28 })),
    { wch: 12 }, // month
    { wch: 12 }, // value
  ];
  XLSX.utils.book_append_sheet(wb, wsPivot, 'Pivot-ready');

  XLSX.writeFile(wb, filename);
}
