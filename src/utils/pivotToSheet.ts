import type { CellWithRowAndCol, Sheet } from '@fortune-sheet/core';
import type { PivotLevel, PivotNode } from '../types/analytics';
import { formatMonthLabel } from './dateUtils';
import { PIVOT_LEVEL_LABELS } from './pivotTable';

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
}

function flattenTreeWithPath(
  nodes: PivotNode[],
  path: Partial<Record<PivotLevel, string>>,
  expanded: Set<string>,
): SheetRow[] {
  const result: SheetRow[] = [];

  for (const node of nodes) {
    const newPath = { ...path, [node.level]: node.label };
    result.push({
      level: node.level,
      path: newPath,
      monthly: node.monthly,
      total: node.total,
    });

    if (expanded.has(node.id) && node.children.length > 0) {
      result.push(...flattenTreeWithPath(node.children, newPath, expanded));
    }
  }

  return result;
}

function headerCell(r: number, c: number, text: string): CellWithRowAndCol {
  return {
    r,
    c,
    v: {
      v: text,
      m: text,
      bl: 1,
      bg: '#F8FAFC',
      fc: '#374151',
      ht: c === 0 ? 1 : 2,
    },
  };
}

function textCell(r: number, c: number, text: string, bold = false): CellWithRowAndCol {
  return {
    r,
    c,
    v: {
      v: text,
      m: text,
      ht: 1,
      ...(bold ? { bl: 1, bg: '#F1F5F9' } : {}),
    },
  };
}

function numberCell(r: number, c: number, value: number, bold = false): CellWithRowAndCol {
  return {
    r,
    c,
    v: {
      v: value,
      m: String(value),
      ct: { fa: 'General', t: 'n' },
      ht: 2,
      ...(bold ? { bl: 1, bg: '#F1F5F9' } : {}),
    },
  };
}

export function pivotToSheetData(
  tree: PivotNode[],
  months: string[],
  dimensionLevels: PivotLevel[],
): Sheet[] {
  const expanded = getAllExpandableIds(tree);
  const rows = flattenTreeWithPath(tree, {}, expanded);
  const celldata: CellWithRowAndCol[] = [];

  const dimHeaders = dimensionLevels.map((l) => PIVOT_LEVEL_LABELS[l]);
  const headers = [...dimHeaders, ...months.map(formatMonthLabel), 'Итого'];
  headers.forEach((h, c) => celldata.push(headerCell(0, c, h)));

  const firstMonthCol = dimensionLevels.length;
  const totalCol = headers.length - 1;
  const leafLevel = dimensionLevels[dimensionLevels.length - 1];

  rows.forEach((row, idx) => {
    const r = idx + 1;

    dimensionLevels.forEach((level, di) => {
      const val = row.path[level] ?? '';
      if (val) celldata.push(textCell(r, di, val));
    });

    months.forEach((m, mi) => {
      celldata.push(numberCell(r, firstMonthCol + mi, row.monthly[m] ?? 0));
    });

    celldata.push(numberCell(r, totalCol, row.total));
  });

  const leafRows = rows.filter((row) => row.level === leafLevel);
  const totalRow = rows.length + 1;

  if (leafRows.length > 0) {
    celldata.push(textCell(totalRow, 0, 'Итого', true));
    for (let di = 1; di < dimensionLevels.length; di++) {
      celldata.push(textCell(totalRow, di, '', true));
    }

    months.forEach((m, mi) => {
      const sum = leafRows.reduce((s, row) => s + (row.monthly[m] ?? 0), 0);
      celldata.push(numberCell(totalRow, firstMonthCol + mi, sum, true));
    });

    const grandTotal = leafRows.reduce((s, row) => s + row.total, 0);
    celldata.push(numberCell(totalRow, totalCol, grandTotal, true));
  }

  const columnlen: Record<string, number> = {};
  dimensionLevels.forEach((_, i) => {
    columnlen[String(i)] = i === 0 ? 140 : 220;
  });
  for (let i = 0; i < months.length; i++) {
    columnlen[String(firstMonthCol + i)] = 96;
  }
  columnlen[String(totalCol)] = 96;

  const rowCount = Math.max(totalRow + 40, 80);
  const colCount = Math.max(headers.length + 2, 16);

  return [
    {
      id: 'pivot_sales',
      name: 'Продажи',
      status: 1,
      order: 0,
      celldata,
      row: rowCount,
      column: colCount,
      defaultColWidth: 88,
      defaultRowHeight: 22,
      showGridLines: 1,
      config: { columnlen },
    },
  ];
}

export function pivotSheetKey(
  order: string,
  levels: PivotLevel[],
  months: string[],
  recordCount: number,
): string {
  return `${order}:${levels.join(',')}:${months.join(',')}:${recordCount}`;
}
