import {
  COLUMN_MAPPING,
  EMPTY_VALUES,
  FALLBACK_MAPPING,
  REQUIRED_COLUMNS,
} from '../constants/columnMapping';
import type { ColumnMapping, DataLoadError, SalesRecord } from '../types/sales';
import { parseDate, toMonthKey } from './dateUtils';
import { normalizeString, parseSalesCount } from './formatters';

function getField(row: Record<string, string>, key: keyof ColumnMapping): string {
  const primary = COLUMN_MAPPING[key];
  const fallbacks = FALLBACK_MAPPING[key] ?? [];
  const value = row[primary] ?? fallbacks.map((f) => row[f]).find(Boolean);
  return normalizeString(value);
}

export function validateCsvColumns(headers: string[]): DataLoadError | null {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) return 'missing_columns';
  return null;
}

export function normalizeCsvRow(row: Record<string, string>): SalesRecord | null {
  const periodStartRaw = getField(row, 'periodStart');
  const periodStart = parseDate(periodStartRaw);

  if (!periodStart) return null;

  const network = getField(row, 'network') || EMPTY_VALUES.network;
  const city = getField(row, 'city') || EMPTY_VALUES.city;
  const fullCityRaw = getField(row, 'fullCity');
  const fullCity = fullCityRaw || city;
  const federalSubject = getField(row, 'federalSubject') || EMPTY_VALUES.federalSubject;
  const address = getField(row, 'address') || EMPTY_VALUES.address;
  const product = getField(row, 'product') || EMPTY_VALUES.product;
  const sku = getField(row, 'sku') || EMPTY_VALUES.sku;
  const salesCount = parseSalesCount(getField(row, 'salesCount'));

  const periodEndRaw = getField(row, 'periodEnd');
  const periodEnd = periodEndRaw ? parseDate(periodEndRaw) : null;
  const monthKey = toMonthKey(periodStart);

  const pointId = `${network}|${city}|${address}`;

  return {
    network,
    city,
    fullCity,
    federalSubject,
    address,
    periodStart,
    periodEnd,
    product,
    sku,
    salesCount,
    monthKey,
    pointId,
  };
}

export interface ParsedCsvPayload {
  records: SalesRecord[];
  rowCount: number;
  minDate: string;
  maxDate: string;
}

export type PapaParseFn = <T>(
  text: string,
  config: {
    header: boolean;
    skipEmptyLines: boolean;
    complete: (results: {
      data: T[];
      meta: { fields?: string[] };
    }) => void;
    error: () => void;
  },
) => void;

export function parseCsvTextWithPapa(
  text: string,
  Papa: { parse: PapaParseFn },
): Promise<ParsedCsvPayload> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          reject({ type: 'empty_csv' as DataLoadError });
          return;
        }

        const headers = results.meta.fields ?? [];
        const columnError = validateCsvColumns(headers);
        if (columnError) {
          reject({ type: columnError });
          return;
        }

        const records: SalesRecord[] = [];
        let minDate = '';
        let maxDate = '';

        for (let index = 0; index < results.data.length; index++) {
          const normalized = normalizeCsvRow(results.data[index]);
          if (!normalized) continue;
          records.push(normalized);
          if (!minDate || normalized.monthKey < minDate) minDate = normalized.monthKey;
          if (!maxDate || normalized.monthKey > maxDate) maxDate = normalized.monthKey;
        }

        if (!records.length) {
          reject({ type: 'empty_csv' as DataLoadError });
          return;
        }

        resolve({ records, rowCount: results.data.length, minDate, maxDate });
      },
      error: () => {
        reject({ type: 'parse_error' as DataLoadError });
      },
    });
  });
}
