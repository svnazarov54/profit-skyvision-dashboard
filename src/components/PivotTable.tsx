import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Download } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { PivotHierarchyOrder } from '../types/filters';
import type { PivotNode } from '../types/analytics';
import { formatMonthLabel } from '../utils/dateUtils';
import { exportPivotToExcel } from '../utils/exportExcel';
import { formatNumber } from '../utils/formatters';
import {
  computeGrandTotal,
  flattenPivotRowsSorted,
  type PivotSortDir,
  type PivotSortKey,
} from '../utils/pivotTable';
import { CellBarValue, MomDeltaCell, Sparkline } from './Sparkline';
import { Hint, Tip } from './Tooltip';
import { Card } from './ui';

interface PivotTableProps {
  tree: PivotNode[];
  months: string[];
  order: PivotHierarchyOrder;
  onOrderChange: (order: PivotHierarchyOrder) => void;
  expanded: Set<string>;
  onExpandedChange: (expanded: Set<string>) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  network: 'Сеть',
  region: 'Регион',
  city: 'Город',
  pharmacy: 'Аптека',
};

/** Fixed left block width (px) — ≤ ~33% on typical screens */
const COL = {
  name: 240,
  trend: 84,
  mom: 76,
  month: 92,
  total: 96,
} as const;

const STICKY = {
  name: 0,
  trend: COL.name,
  mom: COL.name + COL.trend,
} as const;

const FIXED_WIDTH = COL.name + COL.trend + COL.mom;

export function PivotTable({
  tree,
  months,
  order,
  onOrderChange,
  expanded,
  onExpandedChange,
}: PivotTableProps) {
  const [sortKey, setSortKey] = useState<PivotSortKey>('total');
  const [sortDir, setSortDir] = useState<PivotSortDir>('desc');
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onExpandedChange(next);
  };

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (nodes: PivotNode[]) => {
      for (const n of nodes) {
        if (n.children.length) {
          all.add(n.id);
          walk(n.children);
        }
      }
    };
    walk(tree);
    onExpandedChange(all);
  };

  const collapseAll = () => onExpandedChange(new Set());

  const rows = useMemo(
    () => flattenPivotRowsSorted(tree, expanded, sortKey, sortDir, months),
    [tree, expanded, sortKey, sortDir, months],
  );

  const grandTotal = useMemo(() => computeGrandTotal(tree, months), [tree, months]);

  const toggleSort = (key: PivotSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: PivotSortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-0.5 inline h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-0.5 inline h-3 w-3 text-[#2563EB]" />
    ) : (
      <ArrowDown className="ml-0.5 inline h-3 w-3 text-[#2563EB]" />
    );
  };

  const stickyBg = (isHeader = false) =>
    isHeader ? 'bg-[#F8FAFC]' : 'bg-white group-hover:bg-[#F8FAFC]';

  const handleExport = () => exportPivotToExcel(tree, months);

  const tableMinWidth = FIXED_WIDTH + months.length * COL.month + COL.total;

  return (
    <>
      <Card
        title="Сводная таблица продаж"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[#E5E7EB] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onOrderChange('network-first')}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  order === 'network-first' ? 'bg-[#2563EB] text-white' : 'text-[#6B7280]'
                }`}
              >
                Сеть → Регион
              </button>
              <button
                type="button"
                onClick={() => onOrderChange('region-first')}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  order === 'region-first' ? 'bg-[#2563EB] text-white' : 'text-[#6B7280]'
                }`}
              >
                Регион → Сеть
              </button>
            </div>
            <button type="button" onClick={expandAll} className="text-xs text-[#2563EB] hover:underline">
              Развернуть все
            </button>
            <button type="button" onClick={collapseAll} className="text-xs text-[#6B7280] hover:underline">
              Свернуть
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium hover:border-[#2563EB]"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>
        }
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
          <p className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-8 rounded-full bg-[#2563EB]/50" />
            Доля от суммы за месяц
            <Hint text="Полоска в ячейке показывает долю продаж строки от общей суммы за этот месяц по всей таблице" />
          </p>
          {months.length > 6 && (
            <p className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[#2563EB]">
              ← прокрутите таблицу для просмотра всех месяцев →
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6B7280]">Нет данных</p>
        ) : (
          <div
            ref={scrollRef}
            className="overflow-x-auto rounded-lg border border-[#E5E7EB]"
          >
            <table
              className="border-collapse text-left text-sm"
              style={{ minWidth: tableMinWidth }}
            >
              <thead>
                <tr className="bg-[#F8FAFC]">
                  <th
                    className={`sticky z-30 cursor-pointer border-b border-[#E5E7EB] px-3 py-3 text-xs font-semibold uppercase text-[#6B7280] ${stickyBg(true)}`}
                    style={{ left: STICKY.name, minWidth: COL.name, maxWidth: COL.name, width: COL.name }}
                    onClick={() => toggleSort('name')}
                  >
                    Название
                    <SortIcon column="name" />
                  </th>
                  <th
                    className={`sticky z-30 border-b border-[#E5E7EB] px-2 py-3 text-center text-xs font-semibold uppercase text-[#6B7280] ${stickyBg(true)}`}
                    style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      Тренд
                      <Hint text="Мини-график динамики продаж по месяцам в строке" />
                    </span>
                  </th>
                  <th
                    className={`sticky z-30 cursor-pointer border-b border-r-2 border-[#E5E7EB] px-2 py-3 text-center text-xs font-semibold uppercase text-[#6B7280] shadow-[4px_0_6px_-4px_rgba(0,0,0,0.1)] ${stickyBg(true)}`}
                    style={{ left: STICKY.mom, minWidth: COL.mom, width: COL.mom }}
                    onClick={() => toggleSort('mom')}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      MoM
                      <Hint text="Изменение последнего месяца к предыдущему" />
                    </span>
                    <SortIcon column="mom" />
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="cursor-pointer whitespace-nowrap border-b border-[#E5E7EB] px-2 py-3 text-right text-xs font-semibold uppercase text-[#6B7280]"
                      style={{ minWidth: COL.month, width: COL.month }}
                      onClick={() => toggleSort(m)}
                    >
                      {formatMonthLabel(m)}
                      <SortIcon column={m} />
                    </th>
                  ))}
                  <th
                    className="sticky right-0 z-30 cursor-pointer whitespace-nowrap border-b border-l border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3 text-right text-xs font-semibold uppercase text-[#6B7280] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]"
                    style={{ minWidth: COL.total, width: COL.total }}
                    onClick={() => toggleSort('total')}
                  >
                    Итого
                    <SortIcon column="total" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hasChildren = row.children.length > 0;
                  const isExpanded = expanded.has(row.id);
                  const sparkValues = months.map((m) => row.monthly[m] ?? 0);

                  return (
                    <tr key={row.id} className="group border-b border-[#F3F4F6] hover:bg-[#F8FAFC]">
                      <td
                        className={`sticky z-20 px-3 py-2 ${stickyBg()}`}
                        style={{ left: STICKY.name, minWidth: COL.name, maxWidth: COL.name, width: COL.name }}
                      >
                        <div
                          className="flex items-center gap-1"
                          style={{ paddingLeft: `${row.depth * 14}px` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(row.id)}
                              className="shrink-0 rounded p-0.5 hover:bg-[#E5E7EB]"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                            >
                              <ChevronRight
                                className={`h-4 w-4 text-[#6B7280] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          ) : (
                            <span className="inline-block w-5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase leading-none text-[#9CA3AF]">
                              {LEVEL_LABELS[row.level]}
                            </div>
                            <Tip content={row.label} maxWidth={360}>
                              <div className="truncate text-[#111827]">{row.label}</div>
                            </Tip>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`sticky z-20 px-2 py-2 text-center ${stickyBg()}`}
                        style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                      >
                        <Sparkline values={sparkValues} />
                      </td>
                      <td
                        className={`sticky z-20 border-r-2 border-[#E5E7EB] px-2 py-2 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.06)] ${stickyBg()}`}
                        style={{ left: STICKY.mom, minWidth: COL.mom, width: COL.mom }}
                      >
                        <MomDeltaCell monthly={row.monthly} months={months} />
                      </td>
                      {months.map((m) => (
                        <td
                          key={m}
                          className="px-2 py-2 align-middle"
                          style={{ minWidth: COL.month, width: COL.month }}
                        >
                          <CellBarValue
                            value={row.monthly[m] ?? 0}
                            monthTotal={grandTotal.monthly[m] ?? 0}
                            monthLabel={formatMonthLabel(m)}
                          />
                        </td>
                      ))}
                      <td
                        className="sticky right-0 z-20 whitespace-nowrap border-l border-[#F3F4F6] bg-white px-3 py-2 text-right text-sm font-semibold tabular-nums text-[#111827] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.06)] group-hover:bg-[#F8FAFC]"
                        style={{ minWidth: COL.total, width: COL.total }}
                      >
                        {formatNumber(row.total)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#2563EB]/20 bg-[#EFF6FF]/50 font-semibold">
                  <td
                    className="sticky z-20 bg-[#EFF6FF]/95 px-3 py-2.5 text-[#111827]"
                    style={{ left: STICKY.name, minWidth: COL.name, width: COL.name }}
                    colSpan={1}
                  >
                    Итого по выборке
                  </td>
                  <td
                    className="sticky z-20 bg-[#EFF6FF]/95"
                    style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                  />
                  <td
                    className="sticky z-20 border-r-2 border-[#E5E7EB] bg-[#EFF6FF]/95 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.06)]"
                    style={{ left: STICKY.mom, minWidth: COL.mom, width: COL.mom }}
                  />
                  {months.map((m) => (
                    <td
                      key={m}
                      className="px-2 py-2.5 text-right text-sm tabular-nums text-[#111827]"
                      style={{ minWidth: COL.month, width: COL.month }}
                    >
                      {grandTotal.monthly[m]
                        ? formatNumber(grandTotal.monthly[m])
                        : '—'}
                    </td>
                  ))}
                  <td
                    className="sticky right-0 z-20 border-l border-[#BFDBFE] bg-[#EFF6FF]/95 px-3 py-2.5 text-right text-sm tabular-nums text-[#2563EB] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.06)]"
                    style={{ minWidth: COL.total, width: COL.total }}
                  >
                    {formatNumber(grandTotal.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="h-[40vh]" aria-hidden="true" />
    </>
  );
}
