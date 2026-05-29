import { formatMonthLabel, getPreviousMonthKey } from './dateUtils';

function getYoYMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${Number(year) - 1}-${month}`;
}
import type { TimeGrouping } from '../types/filters';

const QUARTER_LABELS = ['I', 'II', 'III', 'IV'] as const;

export function monthKeyToPeriodKey(monthKey: string, grouping: TimeGrouping): string {
  if (grouping === 'month') return monthKey;
  const [year, month] = monthKey.split('-').map(Number);
  if (grouping === 'year') return String(year);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export function formatPeriodLabel(periodKey: string, grouping: TimeGrouping): string {
  if (grouping === 'month') return formatMonthLabel(periodKey);
  if (grouping === 'year') return periodKey;

  const match = periodKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return periodKey;
  const year = match[1];
  const q = Number(match[2]);
  return `${QUARTER_LABELS[q - 1]} кв. ${year}`;
}

export function formatPeriodShort(periodKey: string, grouping: TimeGrouping): string {
  if (grouping === 'month') {
    const [year, month] = periodKey.split('-').map(Number);
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${months[month - 1]} ${String(year).slice(2)}`;
  }
  if (grouping === 'year') return periodKey;
  const match = periodKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return periodKey;
  return `Q${match[2]} ${match[1].slice(2)}`;
}

export function getPreviousPeriodKey(
  periodKey: string,
  grouping: TimeGrouping,
): string | null {
  if (grouping === 'month') return getPreviousMonthKey(periodKey);

  if (grouping === 'year') {
    const year = Number(periodKey);
    if (!Number.isFinite(year)) return null;
    return String(year - 1);
  }

  const match = periodKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  let year = Number(match[1]);
  let quarter = Number(match[2]);
  if (quarter === 1) {
    year -= 1;
    quarter = 4;
  } else {
    quarter -= 1;
  }
  return `${year}-Q${quarter}`;
}

export function getYoYPeriodKeyForGrouping(
  periodKey: string,
  grouping: TimeGrouping,
): string {
  if (grouping === 'month') return getYoYMonthKey(periodKey);
  if (grouping === 'year') return String(Number(periodKey) - 1);

  const match = periodKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return periodKey;
  return `${Number(match[1]) - 1}-Q${match[2]}`;
}

export function comparePeriodKeys(a: string, b: string, grouping: TimeGrouping): number {
  if (grouping === 'month' || grouping === 'year') return a.localeCompare(b);
  const parseQ = (key: string) => {
    const m = key.match(/^(\d{4})-Q([1-4])$/);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  };
  const [ay, aq] = parseQ(a);
  const [by, bq] = parseQ(b);
  if (ay !== by) return ay - by;
  return aq - bq;
}

export function sortPeriodKeys(keys: Iterable<string>, grouping: TimeGrouping): string[] {
  return [...keys].sort((a, b) => comparePeriodKeys(a, b, grouping));
}

export function collectPeriodKeysFromMonthKeys(
  monthKeys: Iterable<string>,
  grouping: TimeGrouping,
): string[] {
  const set = new Set<string>();
  for (const mk of monthKeys) {
    set.add(monthKeyToPeriodKey(mk, grouping));
  }
  return sortPeriodKeys(set, grouping);
}

export type PeriodComparisonMetric = 'mom' | 'qoq' | 'yoy';

export function getPeriodComparisonMetric(grouping: TimeGrouping): PeriodComparisonMetric {
  if (grouping === 'year') return 'yoy';
  if (grouping === 'quarter') return 'qoq';
  return 'mom';
}

export function getPeriodComparisonLabel(grouping: TimeGrouping): string {
  const metric = getPeriodComparisonMetric(grouping);
  if (metric === 'qoq') return 'QoQ';
  if (metric === 'yoy') return 'YoY';
  return 'MoM';
}

export const TIME_GROUPING_LABELS: Record<TimeGrouping, string> = {
  month: 'Месяцы',
  quarter: 'Кварталы',
  year: 'Годы',
};

export const SALES_TREND_TITLES: Record<TimeGrouping, string> = {
  month: 'Динамика продаж по месяцам',
  quarter: 'Динамика продаж по кварталам',
  year: 'Динамика продаж по годам',
};
