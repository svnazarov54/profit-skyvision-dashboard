import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Download } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PivotHierarchyOrder, TimeGrouping } from '../types/filters';
import type { PivotLevel, PivotNode } from '../types/analytics';
import { exportPivotToExcel } from '../utils/exportExcel';
import { formatNumber } from '../utils/formatters';
import { formatPeriodLabel, getPeriodComparisonLabel } from '../utils/periodGrouping';
import {
  calcPeriodSequentialPct,
  calcPeriodYoyPct,
  computeGrandTotal,
  flattenPivotRowsSorted,
  getOrderedPivotLevels,
  PIVOT_LEVEL_LABELS,
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
  timeGrouping: TimeGrouping;
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

function periodGroupWidth(showSequential: boolean): number {
  return COL.subValue + (showSequential ? COL.subMom : 0) + COL.subYoy;
}

const STICKY = {
  name: 0,
  trend: COL.name,
} as const;

const FIXED_WIDTH = COL.name + COL.trend;

function metricHeaders(timeGrouping: TimeGrouping): { metric: PivotMonthMetric; label: string }[] {
  const seq = getPeriodComparisonLabel(timeGrouping);
  const headers: { metric: PivotMonthMetric; label: string }[] = [
    { metric: 'value', label: 'Знач.' },
  ];
  if (timeGrouping !== 'year') {
    headers.push({ metric: 'mom', label: seq });
  }
  headers.push({ metric: 'yoy', label: 'YoY' });
  return headers;
}

function PeriodMetricCells({
  monthly,
  yoyMonthly,
  periodKey,
  periods,
  timeGrouping,
}: {
  monthly: Record<string, number>;
  yoyMonthly: Record<string, number>;
  periodKey: string;
  periods: string[];
  timeGrouping: TimeGrouping;
}) {
  const value = monthly[periodKey] ?? 0;
  const sequential =
    timeGrouping !== 'year'
      ? calcPeriodSequentialPct(monthly, periodKey, periods)
      : null;
  const yoy = calcPeriodYoyPct(monthly, yoyMonthly, periodKey, timeGrouping);
  const showSequential = timeGrouping !== 'year';

  return (
    <>
      <td
        className="border-l border-[#F3F4F6] px-1.5 py-2 align-middle"
        style={{ minWidth: COL.subValue, width: COL.subValue }}
      >
        <PivotValueCell value={value} />
      </td>
      {showSequential && (
        <td
          className="px-1.5 py-2 align-middle"
          style={{ minWidth: COL.subMom, width: COL.subMom }}
        >
          <PivotPctCell pct={sequential} />
        </td>
      )}
      <td
        className="border-r border-[#E5E7EB] px-1.5 py-2 align-middle"
        style={{ minWidth: COL.subYoy, width: COL.subYoy }}
      >
        <PivotPctCell pct={yoy} />
      </td>
    </>
  );
}

export const PivotTable = memo(function PivotTable({
  tree,
  months,
  timeGrouping,
  order,
  onOrderChange,
  expanded,
  onExpandedChange,
}: PivotTableProps) {
  const [sortKey, setSortKey] = useState<PivotSortKey>('total');
  const [sortDir, setSortDir] = useState<PivotSortDir>('desc');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);
  const metricHeadersList = useMemo(() => metricHeaders(timeGrouping), [timeGrouping]);
  const showSequential = timeGrouping !== 'year';
  const monthGroupWidth = periodGroupWidth(showSequential);
  const orderedLevels = useMemo(() => getOrderedPivotLevels(order), [order]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLevels, setExportLevels] = useState<PivotLevel[]>(() => [...orderedLevels]);

  // Keep selection compatible with current hierarchy order.
  useEffect(() => {
    setExportLevels((prev) => {
      const next = orderedLevels.filter((l) => prev.includes(l));
      return next.length > 0 ? next : [orderedLevels[0]];
    });
  }, [orderedLevels]);

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
    () => flattenPivotRowsSorted(tree, expanded, sortKey, sortDir, months, 0, timeGrouping),
    [tree, expanded, sortKey, sortDir, months, timeGrouping],
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

  const activeExportLevels = useMemo(() => {
    const picked = orderedLevels.filter((l) => exportLevels.includes(l));
    return picked.length > 0 ? picked : [orderedLevels[0]];
  }, [orderedLevels, exportLevels]);

  const handleExport = () => setExportOpen(true);
  const runExport = () => {
    exportPivotToExcel(tree, months, activeExportLevels, timeGrouping);
    setExportOpen(false);
  };

  const tableMinWidth = FIXED_WIDTH + months.length * monthGroupWidth + COL.total;

  useEffect(() => {
    const tableScroll = scrollRef.current;
    const barScroll = hScrollRef.current;
    if (!tableScroll || !barScroll) return;

    let syncing = false;
    const sync = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (syncing) return;
      syncing = true;
      target.scrollLeft = source.scrollLeft;
      syncing = false;
    };

    const onTableScroll = () => sync(tableScroll, barScroll);
    const onBarScroll = () => sync(barScroll, tableScroll);

    tableScroll.addEventListener('scroll', onTableScroll, { passive: true });
    barScroll.addEventListener('scroll', onBarScroll, { passive: true });
    return () => {
      tableScroll.removeEventListener('scroll', onTableScroll);
      barScroll.removeEventListener('scroll', onBarScroll);
    };
  }, [tableMinWidth, rows.length]);

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
            ← используйте горизонтальную полосу прокрутки над таблицей →
          </p>
        )}

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6B7280]">Нет данных</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
            <div
              ref={hScrollRef}
              className="pivot-table-h-scrollbar overflow-x-scroll overflow-y-hidden border-b border-[#E5E7EB] bg-[#F8FAFC]"
              aria-label="Горизонтальная прокрутка таблицы"
            >
              <div style={{ width: tableMinWidth, height: 1 }} aria-hidden />
            </div>
            <div ref={scrollRef} className="pivot-table-body-scroll overflow-x-scroll">
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
                      colSpan={metricHeadersList.length}
                      className="border-b border-l border-[#E5E7EB] px-2 py-2 text-center text-xs font-semibold uppercase text-[#374151]"
                    >
                      {formatPeriodLabel(m, timeGrouping)}
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
                    metricHeadersList.map(({ metric, label }, idx) => (
                      <th
                        key={`${m}-${metric}`}
                        className={`cursor-pointer border-b border-[#E5E7EB] px-1 py-2 text-right text-[10px] font-semibold uppercase text-[#6B7280] ${
                          idx === 0 ? 'border-l border-[#E5E7EB]' : ''
                        } ${idx === metricHeadersList.length - 1 ? 'border-r border-[#E5E7EB]' : ''}`}
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
                <tr className="border-b-2 border-[#2563EB]/20 bg-[#EFF6FF]/50 font-semibold">
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
                    <PeriodMetricCells
                      key={`total-${m}`}
                      monthly={grandTotal.monthly}
                      yoyMonthly={grandTotal.yoyMonthly}
                      periodKey={m}
                      periods={months}
                      timeGrouping={timeGrouping}
                    />
                  ))}
                  <td
                    className="sticky right-0 z-20 border-l border-[#BFDBFE] bg-[#EFF6FF]/95 px-3 py-2.5 text-right text-sm tabular-nums text-[#2563EB] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.06)]"
                    style={{ minWidth: COL.total, width: COL.total }}
                  >
                    {formatNumber(grandTotal.total)}
                  </td>
                </tr>
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
                        <PeriodMetricCells
                          key={m}
                          monthly={row.monthly}
                          yoyMonthly={row.yoyMonthly}
                          periodKey={m}
                          periods={months}
                          timeGrouping={timeGrouping}
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
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>
      {exportOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Экспорт в Excel"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExportOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[#111827]">Экспорт в Excel</div>
                <div className="mt-0.5 text-sm text-[#6B7280]">
                  Выберите, какие уровни иерархии попадут в выгрузку.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#E5E7EB]">
              {orderedLevels.map((level) => {
                const checked = exportLevels.includes(level);
                const canUncheck = exportLevels.length > 1;
                return (
                  <label
                    key={level}
                    className="flex cursor-pointer items-center gap-3 border-b border-[#F3F4F6] px-4 py-3 text-sm last:border-b-0 hover:bg-[#F8FAFC]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={checked && !canUncheck}
                      onChange={() => {
                        setExportLevels((prev) => {
                          const has = prev.includes(level);
                          if (has) {
                            const next = prev.filter((l) => l !== level);
                            return next.length > 0 ? next : prev;
                          }
                          return [...prev, level];
                        });
                      }}
                    />
                    <span className="font-medium text-[#111827]">{PIVOT_LEVEL_LABELS[level]}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportLevels([...orderedLevels])}
                  className="text-sm font-medium text-[#2563EB] hover:underline"
                >
                  Выбрать всё
                </button>
                <span className="text-[#E5E7EB]">|</span>
                <button
                  type="button"
                  onClick={() => setExportLevels([orderedLevels[0]])}
                  className="text-sm font-medium text-[#6B7280] hover:underline"
                >
                  Оставить только первый
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportOpen(false)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] hover:border-[#9CA3AF]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={runExport}
                  className="rounded-lg bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Скачать Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="h-[40vh]" aria-hidden="true" />
    </>
  );
});
