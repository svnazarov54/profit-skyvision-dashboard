export type PeriodPreset =
  | 'all'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'current_year'
  | 'previous_year';

export interface FilterState {
  periodPreset: PeriodPreset;
  dateFrom: string | null;
  dateTo: string | null;
  networks: string[];
  cities: string[];
  federalSubjects: string[];
  points: string[];
  skus: string[];
}

export interface FilterOptions {
  networks: string[];
  cities: string[];
  federalSubjects: string[];
  points: { id: string; label: string }[];
  skus: string[];
  minDate: string;
  maxDate: string;
}

export const DEFAULT_FILTERS: FilterState = {
  periodPreset: 'all',
  dateFrom: null,
  dateTo: null,
  networks: [],
  cities: [],
  federalSubjects: [],
  points: [],
  skus: [],
};

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  all: 'Весь период',
  last_3_months: 'Последние 3 месяца',
  last_6_months: 'Последние 6 месяцев',
  last_12_months: 'Последние 12 месяцев',
  current_year: 'Текущий год',
  previous_year: 'Предыдущий год',
};

export type PivotHierarchyOrder = 'region-only' | 'network-first' | 'region-first';

export type SplitChartDimension = 'network' | 'region';
