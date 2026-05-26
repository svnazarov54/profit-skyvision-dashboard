import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Download } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { PivotHierarchyOrder } from '../types/filters';
import type { PivotNode } from '../types/analytics';
import { formatMonthLabel } from '../utils/dateUtils';
import { exportPivotToExcel } from '../utils/exportExcel';
import { formatNumber } from '../utils/formatters';
import {
  calcMonthMomPct,
  calcMonthYoyPct,
  computeGrandTotal,
  flattenPivotRowsSorted,
  pivotMonthSortKey,
  type PivotMonthMetric,
  type PivotSortDir,
  type PivotSortKey,
} from '../utils/pivotTable';
import { PivotPctCell, PivotValueCell, Sparkline } from './Sparkline';
import { Tip } from './Tooltip';
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

const ORDER_TABS: { id: PivotHierarchyOrder; label: string }[] = [
  { id: 'region-only', label: 'Только регион' },
  { id: 'network-first', label: 'Сеть → Регион' },
  { id: 'region-first', label: 'Регион → Сеть' },
];

const COL = {
  name: 240,
  trend: 84,
  subValue: 76,
  subMom: 60,
  subYoy: 60,
  total: 96,
} as const;

const MONTH_GROUP_WIDTH = COL.subValue + COL.subMom + COL.subYoy;

const STICKY = {
  name: 0,
  trend: COL.name,
} as const;

const FIXED_WIDTH = COL.name + COL.trend;

const METRIC_HEADERS: { metric: PivotMonthMetric; label: string }[] = [
  { metric: 'value', label: 'Знач.' },
  { metric: 'mom', label: 'MoM' },
  { metric: 'yoy', label: 'YoY' },
];

function MonthMetricCells({
  monthly,
  yoyMonthly,
  monthKey,
  months,
}: {
  monthly: Record<string, number>;
  yoyMonthly: Record<string, number>;
  monthKey: string;
  months: string[];
}) {
  const value = monthly[monthKey] ?? 0;
  const mom = calcMonthMomPct(monthly, monthKey, months);
  const yoy = calcMonthYoyPct(monthly, yoyMonthly, monthKey);

  return (
    <>
      <td
        className="border-l border-[#F3F4F6] px-1.5 py-2 align-middle"
        style={{ minWidth: COL.subValue, width: COL.subValue }}
      >
        <PivotValueCell value={value} />
      </td>
      <td
        className="px-1.5 py-2 align-middle"
        style={{ minWidth: COL.subMom, width: COL.subMom }}
      >
        <PivotPctCell pct={mom} />
      </td>
      <td
        className="border-r border-[#E5E7EB] px-1.5 py-2 align-middle"
        style={{ minWidth: COL.subYoy, width: COL.subYoy }}
      >
        <PivotPctCell pct={yoy} />
      </td>
    </>
  );
}

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

  const tableMinWidth = FIXED_WIDTH + months.length * MONTH_GROUP_WIDTH + COL.total;

  return (
    <>
      <Card
        title="Сводная таблица продаж"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border-2 border-[#E5E7EB] bg-[#F8FAFC] p-1">
              {ORDER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onOrderChange(tab.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition md:px-4 md:text-base ${
                    order === tab.id
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#374151] hover:bg-white hover:text-[#2563EB]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={expandAll} className="text-sm text-[#2563EB] hover:underline">
              Развернуть все
            </button>
            <button type="button" onClick={collapseAll} className="text-sm text-[#6B7280] hover:underline">
              Свернуть
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm font-medium hover:border-[#2563EB]"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
          </div>
        }
      >
        {months.length > 4 && (
          <p className="mb-2 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-center text-sm text-[#2563EB]">
            ← прокрутите таблицу для просмотра всех месяцев →
          </p>
        )}

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
                    rowSpan={2}
                    className={`sticky z-30 cursor-pointer border-b border-[#E5E7EB] px-3 py-2 text-xs font-semibold uppercase text-[#6B7280] ${stickyBg(true)}`}
                    style={{ left: STICKY.name, minWidth: COL.name, maxWidth: COL.name, width: COL.name }}
                    onClick={() => toggleSort('name')}
                  >
                    Название
                    <SortIcon column="name" />
                  </th>
                  <th
                    rowSpan={2}
                    className={`sticky z-30 border-b border-r-2 border-[#E5E7EB] px-2 py-2 text-center text-xs font-semibold uppercase text-[#6B7280] shadow-[4px_0_6px_-4px_rgba(0,0,0,0.1)] ${stickyBg(true)}`}
                    style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                  >
                    Тренд
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      colSpan={3}
                      className="border-b border-l border-[#E5E7EB] px-2 py-2 text-center text-xs font-semibold uppercase text-[#374151]"
                    >
                      {formatMonthLabel(m)}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-30 cursor-pointer whitespace-nowrap border-b border-l border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-right text-xs font-semibold uppercase text-[#6B7280] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]"
                    style={{ minWidth: COL.total, width: COL.total }}
                    onClick={() => toggleSort('total')}
                  >
                    Итого
                    <SortIcon column="total" />
                  </th>
                </tr>
                <tr className="bg-[#F8FAFC]">
                  {months.map((m) =>
                    METRIC_HEADERS.map(({ metric, label }, idx) => (
                      <th
                        key={`${m}-${metric}`}
                        className={`cursor-pointer border-b border-[#E5E7EB] px-1 py-2 text-right text-[10px] font-semibold uppercase text-[#6B7280] ${
                          idx === 0 ? 'border-l border-[#E5E7EB]' : ''
                        } ${idx === 2 ? 'border-r border-[#E5E7EB]' : ''}`}
                        style={{
                          minWidth:
                            metric === 'value' ? COL.subValue : metric === 'mom' ? COL.subMom : COL.subYoy,
                          width:
                            metric === 'value' ? COL.subValue : metric === 'mom' ? COL.subMom : COL.subYoy,
                        }}
                        onClick={() => toggleSort(pivotMonthSortKey(m, metric))}
                      >
                        {label}
                        <SortIcon column={pivotMonthSortKey(m, metric)} />
                      </th>
                    )),
                  )}
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
                        className={`sticky z-20 border-r-2 border-[#E5E7EB] px-2 py-2 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.06)] ${stickyBg()}`}
                        style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                      >
                        <Sparkline values={sparkValues} />
                      </td>
                      {months.map((m) => (
                        <MonthMetricCells
                          key={m}
                          monthly={row.monthly}
                          yoyMonthly={row.yoyMonthly}
                          monthKey={m}
                          months={months}
                        />
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
                  >
                    Итого по выборке
                  </td>
                  <td
                    className="sticky z-20 border-r-2 border-[#E5E7EB] bg-[#EFF6FF]/95 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.06)]"
                    style={{ left: STICKY.trend, minWidth: COL.trend, width: COL.trend }}
                  />
                  {months.map((m) => (
                    <MonthMetricCells
                      key={m}
                      monthly={grandTotal.monthly}
                      yoyMonthly={grandTotal.yoyMonthly}
                      monthKey={m}
                      months={months}
                    />
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
