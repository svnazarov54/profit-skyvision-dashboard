import {
  format,
  parse,
  startOfMonth,
  subMonths,
  isValid,
  endOfYear,
  startOfYear,
  subYears,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { PeriodPreset } from '../types/filters';

const RU_MONTHS: Record<string, number> = {
  январь: 0,
  февраль: 1,
  март: 2,
  апрель: 3,
  май: 4,
  июнь: 5,
  июль: 6,
  август: 7,
  сентябрь: 8,
  октябрь: 9,
  ноябрь: 10,
  декабрь: 11,
};

export function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const formats = [
    'yyyy-MM-dd',
    'dd.MM.yyyy',
    'yyyy/MM/dd',
    'MM.yyyy',
    'dd.MM.yy',
  ];

  for (const fmt of formats) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return startOfMonth(parsed);
  }

  const ruMatch = trimmed.match(/^([а-яА-Я]+)\s+(\d{4})$/);
  if (ruMatch) {
    const monthIndex = RU_MONTHS[ruMatch[1].toLowerCase()];
    if (monthIndex !== undefined) {
      return new Date(parseInt(ruMatch[2], 10), monthIndex, 1);
    }
  }

  const isoAttempt = new Date(trimmed);
  if (isValid(isoAttempt)) return startOfMonth(isoAttempt);

  return null;
}

export function toMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, 'LLL yyyy', { locale: ru });
}

export function formatMonthShort(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, 'LLL yy', { locale: ru });
}

export function formatDateRange(from: string, to: string): string {
  return `${formatMonthLabel(from)} — ${formatMonthLabel(to)}`;
}

export function getPeriodRange(
  preset: PeriodPreset,
  minDate: string,
  maxDate: string,
): { from: string; to: string } {
  if (!minDate || !maxDate) {
    return { from: minDate, to: maxDate };
  }

  const max = parse(`${maxDate}-01`, 'yyyy-MM-dd', new Date());
  if (!isValid(max)) {
    return { from: minDate, to: maxDate };
  }

  switch (preset) {
    case 'all':
      return { from: minDate, to: maxDate };
    case 'last_3_months':
      return { from: toMonthKey(subMonths(max, 2)), to: maxDate };
    case 'last_6_months':
      return { from: toMonthKey(subMonths(max, 5)), to: maxDate };
    case 'last_12_months':
      return { from: toMonthKey(subMonths(max, 11)), to: maxDate };
    case 'current_year':
      return {
        from: toMonthKey(startOfYear(max)),
        to: toMonthKey(
          max > endOfYear(max) ? endOfYear(max) : max,
        ),
      };
    case 'previous_year': {
      const prevYear = subYears(max, 1);
      return {
        from: toMonthKey(startOfYear(prevYear)),
        to: toMonthKey(endOfYear(prevYear)),
      };
    }
    default:
      return { from: minDate, to: maxDate };
  }
}

export function monthKeyInRange(
  monthKey: string,
  from: string | null,
  to: string | null,
): boolean {
  if (from && monthKey < from) return false;
  if (to && monthKey > to) return false;
  return true;
}

export function getPreviousPeriodRange(
  from: string,
  to: string,
): { from: string; to: string } {
  if (!from || !to) {
    return { from: '', to: '' };
  }

  const fromDate = parse(`${from}-01`, 'yyyy-MM-dd', new Date());
  const toDate = parse(`${to}-01`, 'yyyy-MM-dd', new Date());

  if (!isValid(fromDate) || !isValid(toDate)) {
    return { from: '', to: '' };
  }

  const monthCount =
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth()) +
    1;

  const prevTo = subMonths(fromDate, 1);
  const prevFrom = subMonths(prevTo, monthCount - 1);

  return {
    from: toMonthKey(prevFrom),
    to: toMonthKey(prevTo),
  };
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = subMonths(new Date(year, month - 1, 1), 1);
  return toMonthKey(date);
}
