import type { FilterState, FilterOptions } from '../types/filters';
import { PERIOD_PRESET_LABELS } from '../types/filters';
import type { SalesRecord } from '../types/sales';
import { getPeriodRange, monthKeyInRange } from './dateUtils';
import { formatPointLabel } from './formatters';

export function resolvePeriodBounds(
  filters: FilterState,
  dateBounds: { minDate: string; maxDate: string },
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

export function filterRecords(
  records: SalesRecord[],
  filters: FilterState,
  dateBounds: { minDate: string; maxDate: string },
): SalesRecord[] {
  const period = resolvePeriodBounds(filters, dateBounds);

  return records.filter((r) => {
    if (!monthKeyInRange(r.monthKey, period.from, period.to)) return false;
    if (filters.networks.length && !filters.networks.includes(r.network)) return false;
    if (filters.cities.length && !filters.cities.includes(r.city)) return false;
    if (
      filters.federalSubjects.length &&
      !filters.federalSubjects.includes(r.federalSubject)
    )
      return false;
    if (filters.points.length && !filters.points.includes(r.pointId)) return false;
    return true;
  });
}

export function filterRecordsWithoutPeriod(
  records: SalesRecord[],
  filters: FilterState,
): SalesRecord[] {
  return records.filter((r) => {
    if (filters.networks.length && !filters.networks.includes(r.network)) return false;
    if (filters.cities.length && !filters.cities.includes(r.city)) return false;
    if (
      filters.federalSubjects.length &&
      !filters.federalSubjects.includes(r.federalSubject)
    )
      return false;
    if (filters.points.length && !filters.points.includes(r.pointId)) return false;
    return true;
  });
}

export function getFilterOptions(
  records: SalesRecord[],
  filters: FilterState,
): FilterOptions {
  const monthKeys = records.map((r) => r.monthKey).sort();
  const minDate = monthKeys[0] ?? '';
  const maxDate = monthKeys[monthKeys.length - 1] ?? '';

  const cascade = (exclude: keyof FilterState) => {
    let filtered = records;

    if (exclude !== 'networks' && filters.networks.length) {
      filtered = filtered.filter((r) => filters.networks.includes(r.network));
    }
    if (exclude !== 'cities' && filters.cities.length) {
      filtered = filtered.filter((r) => filters.cities.includes(r.city));
    }
    if (exclude !== 'federalSubjects' && filters.federalSubjects.length) {
      filtered = filtered.filter((r) =>
        filters.federalSubjects.includes(r.federalSubject),
      );
    }
    if (exclude !== 'points' && filters.points.length) {
      filtered = filtered.filter((r) => filters.points.includes(r.pointId));
    }

    return filtered;
  };

  const unique = (arr: string[]) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'ru'));

  const networkRecords = cascade('networks');
  const cityRecords = cascade('cities');
  const subjectRecords = cascade('federalSubjects');
  const pointRecords = cascade('points');

  const pointMap = new Map<string, string>();
  for (const r of pointRecords) {
    if (!pointMap.has(r.pointId)) {
      pointMap.set(r.pointId, formatPointLabel(r.network, r.city, r.address));
    }
  }

  const points = [...pointMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return {
    networks: unique(networkRecords.map((r) => r.network)),
    cities: unique(cityRecords.map((r) => r.city)),
    federalSubjects: unique(subjectRecords.map((r) => r.federalSubject)),
    points,
    minDate,
    maxDate,
  };
}

export function getActiveFilterSummary(
  filters: FilterState,
): string[] {
  const parts: string[] = [];

  if (filters.periodPreset !== 'all') {
    parts.push(PERIOD_PRESET_LABELS[filters.periodPreset]);
  } else if (filters.dateFrom && filters.dateTo) {
    parts.push(`${filters.dateFrom} — ${filters.dateTo}`);
  }

  filters.networks.forEach((n) => parts.push(n));
  filters.cities.forEach((c) => parts.push(c));
  filters.federalSubjects.forEach((s) => parts.push(s));
  if (filters.points.length) {
    parts.push(`${filters.points.length} точек`);
  }

  return parts;
}

export function getEffectivePeriod(
  filters: FilterState,
  dateBounds: { minDate: string; maxDate: string },
): { from: string; to: string } {
  return resolvePeriodBounds(filters, dateBounds);
}
