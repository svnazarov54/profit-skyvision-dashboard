import * as XLSX from 'xlsx';
import type { PivotNode } from '../types/analytics';
import { flattenPivotRows } from './pivotTable';
import { formatMonthLabel } from './dateUtils';

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

export function exportPivotToExcel(
  tree: PivotNode[],
  months: string[],
  _expanded?: Set<string>,
  filename = 'sales_pivot.xlsx',
): void {
  const rows = flattenPivotRows(tree, getAllExpandableIds(tree));
  const levelLabels: Record<string, string> = {
    network: 'Сеть',
    region: 'Регион',
    city: 'Город',
    pharmacy: 'Аптека',
  };

  const headers = [
    'Уровень',
    'Название',
    ...months.map((m) => formatMonthLabel(m)),
    'Итого',
  ];

  const data = rows.map((row) => [
    levelLabels[row.level],
    row.label,
    ...months.map((m) => row.monthly[m] ?? 0),
    row.total,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Продажи');
  XLSX.writeFile(wb, filename);
}
