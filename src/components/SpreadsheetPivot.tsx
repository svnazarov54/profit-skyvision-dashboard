import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import type { PivotLevel } from '../types/analytics';
import type { PivotHierarchyOrder } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import {
  buildPivotTable,
  getOrderedPivotLevels,
  PIVOT_LEVEL_LABELS,
} from '../utils/pivotTable';
import { pivotSheetKey, pivotToSheetData } from '../utils/pivotToSheet';

interface SpreadsheetPivotProps {
  records: SalesRecord[];
  order: PivotHierarchyOrder;
  onOrderChange: (order: PivotHierarchyOrder) => void;
}

export function SpreadsheetPivot({
  records,
  order,
  onOrderChange,
}: SpreadsheetPivotProps) {
  const orderedLevels = useMemo(() => getOrderedPivotLevels(order), [order]);
  const [selectedLevels, setSelectedLevels] = useState<PivotLevel[]>(() => [
    ...orderedLevels,
  ]);
  const [sheetReady, setSheetReady] = useState(false);

  useEffect(() => {
    setSelectedLevels((prev) => {
      const next = orderedLevels.filter((l) => prev.includes(l));
      return next.length > 0 ? next : [orderedLevels[0]];
    });
  }, [orderedLevels]);

  useEffect(() => {
    setSheetReady(false);
    const id = window.requestAnimationFrame(() => setSheetReady(true));
    return () => window.cancelAnimationFrame(id);
  }, [order, selectedLevels, records.length]);

  const activeLevels = useMemo(() => {
    const picked = orderedLevels.filter((l) => selectedLevels.includes(l));
    return picked.length > 0 ? picked : [orderedLevels[0]];
  }, [orderedLevels, selectedLevels]);

  const remountKey = useMemo(
    () =>
      pivotSheetKey(
        order,
        activeLevels,
        buildPivotTable(records, order, activeLevels).months,
        records.length,
      ),
    [records, order, activeLevels],
  );

  const sheetData = useMemo(() => {
    const { tree, months } = buildPivotTable(records, order, activeLevels);
    return pivotToSheetData(tree, months, activeLevels);
  }, [remountKey, records, order, activeLevels]);

  const gridSize = sheetData[0];

  const toggleLevel = (level: PivotLevel) => {
    setSelectedLevels((prev) => {
      const has = prev.includes(level);
      const activeCount = orderedLevels.filter((l) => prev.includes(l)).length;
      if (has && activeCount <= 1) return prev;
      return has ? prev.filter((l) => l !== level) : [...prev, level];
    });
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="shrink-0 space-y-3 border-b border-[#E5E7EB] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">Сводная таблица</h3>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              Выберите уровни группировки. Формулы вводите с «=», например =SUM(C2:C10)
            </p>
          </div>
          <div className="flex rounded-lg border border-[#E5E7EB] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onOrderChange('network-first')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                order === 'network-first'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Сеть → Регион
            </button>
            <button
              type="button"
              onClick={() => onOrderChange('region-first')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                order === 'region-first'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Регион → Сеть
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#6B7280]">Колонки группировки:</span>
          {orderedLevels.map((level) => {
            const active = selectedLevels.includes(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleLevel(level)}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  active
                    ? 'border-[#2563EB] bg-[#DBEAFE] text-[#2563EB]'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]',
                )}
              >
                {PIVOT_LEVEL_LABELS[level]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fortune-sheet-host">
        {sheetReady ? (
          <Workbook
            key={remountKey}
            data={sheetData}
            lang="ru"
            showToolbar
            showFormulaBar
            showSheetTabs={false}
            allowEdit
            row={gridSize.row ?? 100}
            column={gridSize.column ?? 20}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
            Загрузка таблицы…
          </div>
        )}
      </div>
    </div>
  );
}
