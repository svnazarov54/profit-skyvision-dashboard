import type { FilterState } from '../types/filters';
import { getPeriodRange } from './dateUtils';

export interface DateBounds {
  minDate: string;
  maxDate: string;
}

export function resolvePeriodBounds(
  filters: FilterState,
  dateBounds: DateBounds,
): { from: string; to: string } {
  const { minDate, maxDate } = dateBounds;

  if (filters.periodPreset === 'all' && !filters.dateFrom && !filters.dateTo) {
    return { from: minDate, to: maxDate };
  }

  if (filters.dateFrom || filters.dateTo) {
    return {
      from: filters.dateFrom ?? minDate,
      to: filters.dateTo ?? maxDate,
    };
  }

  return getPeriodRange(filters.periodPreset, minDate, maxDate);
}
