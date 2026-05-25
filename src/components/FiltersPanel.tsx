import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';
import type { FilterOptions, FilterState, PeriodPreset } from '../types/filters';
import { PERIOD_PRESET_LABELS } from '../types/filters';
import { formatDateRange } from '../utils/dateUtils';
import { getPeriodRange } from '../utils/dateUtils';
import { buildFiltersShareUrl } from '../utils/filterUrl';
import {
  DropdownFilter,
  PointCheckboxList,
  SearchableCheckboxList,
} from './ui';

interface FiltersPanelProps {
  filters: FilterState;
  options: FilterOptions;
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
}

const PRESETS: PeriodPreset[] = [
  'all',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'current_year',
  'previous_year',
];

function getFilterSummary(selected: string[], allLabel: string): string {
  if (!selected.length) return allLabel;
  if (selected.length === 1) return selected[0];
  return `Выбрано: ${selected.length}`;
}

function getDateSummary(filters: FilterState, options: FilterOptions): string {
  if (filters.dateFrom && filters.dateTo) {
    return formatDateRange(filters.dateFrom, filters.dateTo);
  }
  if (filters.periodPreset !== 'all') {
    return PERIOD_PRESET_LABELS[filters.periodPreset];
  }
  if (options.minDate && options.maxDate) {
    return formatDateRange(options.minDate, options.maxDate);
  }
  return 'Весь период';
}

export function FiltersPanel({
  filters,
  options,
  onUpdate,
  onReset,
}: FiltersPanelProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const applyPreset = (preset: PeriodPreset) => {
    const range = getPeriodRange(preset, options.minDate, options.maxDate);
    onUpdate('periodPreset', preset);
    onUpdate('dateFrom', range.from || null);
    onUpdate('dateTo', range.to || null);
  };

  const copyShareLink = async () => {
    const url = buildFiltersShareUrl(filters);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt('Скопируйте ссылку:', url);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#111827]">Фильтры</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline"
          >
            {linkCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Ссылка скопирована
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Копировать ссылку
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:underline"
          >
            Сбросить все
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DropdownFilter
          label="Период"
          summary={getDateSummary(filters, options)}
          className="xl:col-span-1"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                Весь период
              </button>
              <span className="text-[#E5E7EB]">|</span>
              <button
                type="button"
                onClick={() => {
                  onUpdate('periodPreset', 'all');
                  onUpdate('dateFrom', null);
                  onUpdate('dateTo', null);
                }}
                className="text-xs font-medium text-[#6B7280] hover:underline"
              >
                Сбросить всё
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">От</label>
                <input
                  type="month"
                  value={filters.dateFrom ?? options.minDate}
                  min={options.minDate}
                  max={options.maxDate}
                  onChange={(e) => {
                    onUpdate('dateFrom', e.target.value || null);
                    onUpdate('periodPreset', 'all');
                  }}
                  className="w-full rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">До</label>
                <input
                  type="month"
                  value={filters.dateTo ?? options.maxDate}
                  min={options.minDate}
                  max={options.maxDate}
                  onChange={(e) => {
                    onUpdate('dateTo', e.target.value || null);
                    onUpdate('periodPreset', 'all');
                  }}
                  className="w-full rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    filters.periodPreset === preset
                      ? 'border-[#2563EB] bg-[#DBEAFE] text-[#2563EB]'
                      : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                  }`}
                >
                  {PERIOD_PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          </div>
        </DropdownFilter>

        <DropdownFilter
          label="Аптечная сеть"
          summary={getFilterSummary(filters.networks, 'Все сети')}
        >
          <SearchableCheckboxList
            options={options.networks}
            selected={filters.networks}
            onChange={(v) => onUpdate('networks', v)}
            placeholder="Поиск сети"
          />
        </DropdownFilter>

        <DropdownFilter
          label="Субъект РФ"
          summary={getFilterSummary(filters.federalSubjects, 'Все регионы')}
        >
          <SearchableCheckboxList
            options={options.federalSubjects}
            selected={filters.federalSubjects}
            onChange={(v) => onUpdate('federalSubjects', v)}
            placeholder="Поиск региона"
          />
        </DropdownFilter>

        <DropdownFilter
          label="Город"
          summary={getFilterSummary(filters.cities, 'Все города')}
        >
          <SearchableCheckboxList
            options={options.cities}
            selected={filters.cities}
            onChange={(v) => onUpdate('cities', v)}
            placeholder="Поиск города"
          />
        </DropdownFilter>

        <DropdownFilter
          label="Аптечная точка"
          summary={getFilterSummary(filters.points, 'Все точки')}
        >
          <PointCheckboxList
            options={options.points}
            selected={filters.points}
            onChange={(v) => onUpdate('points', v)}
          />
        </DropdownFilter>
      </div>
    </div>
  );
}
