import Papa from 'papaparse';
import {
  COLUMN_MAPPING,
  CSV_PATH,
  EMPTY_VALUES,
  FALLBACK_MAPPING,
  REQUIRED_COLUMNS,
} from '../constants/columnMapping';
import type { ColumnMapping, DataLoadError, SalesRecord } from '../types/sales';
import { parseDate, toMonthKey } from '../utils/dateUtils';
import { normalizeString, parseSalesCount } from '../utils/formatters';

function getField(row: Record<string, string>, key: keyof ColumnMapping): string {
  const primary = COLUMN_MAPPING[key];
  const fallbacks = FALLBACK_MAPPING[key] ?? [];
  const value = row[primary] ?? fallbacks.map((f) => row[f]).find(Boolean);
  return normalizeString(value);
}

function validateColumns(headers: string[]): DataLoadError | null {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) return 'missing_columns';
  return null;
}

function normalizeRow(
  row: Record<string, string>,
  index: number,
): SalesRecord | null {
  const periodStartRaw = getField(row, 'periodStart');
  const periodStart = parseDate(periodStartRaw);

  if (!periodStart) {
    console.warn(`[CSV] Строка ${index + 1}: некорректная дата period_start "${periodStartRaw}"`);
    return null;
  }

  const network = getField(row, 'network') || EMPTY_VALUES.network;
  const city = getField(row, 'city') || EMPTY_VALUES.city;
  const fullCityRaw = getField(row, 'fullCity');
  const fullCity = fullCityRaw || city;
  const federalSubject = getField(row, 'federalSubject') || EMPTY_VALUES.federalSubject;
  const address = getField(row, 'address') || EMPTY_VALUES.address;
  const product = getField(row, 'product') || EMPTY_VALUES.product;
  const salesCount = parseSalesCount(getField(row, 'salesCount'));

  if (salesCount < 0) {
    console.warn(`[CSV] Строка ${index + 1}: отрицательное значение quantity ${salesCount}`);
  }

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
    salesCount,
    monthKey,
    pointId,
  };
}

export interface LoadResult {
  records: SalesRecord[];
  rowCount: number;
}

export async function loadCsvData(path = CSV_PATH): Promise<LoadResult> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw { type: 'file_not_found' as DataLoadError };
  }

  if (!response.ok) {
    throw { type: 'file_not_found' as DataLoadError };
  }

  const text = await response.text();

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
        const columnError = validateColumns(headers);
        if (columnError) {
          reject({ type: columnError });
          return;
        }

        const records: SalesRecord[] = [];
        results.data.forEach((row, index) => {
          const normalized = normalizeRow(row, index);
          if (normalized) records.push(normalized);
        });

        if (!records.length) {
          reject({ type: 'empty_csv' as DataLoadError });
          return;
        }

        resolve({ records, rowCount: results.data.length });
      },
      error: () => {
        reject({ type: 'parse_error' as DataLoadError });
      },
    });
  });
}

export const ERROR_MESSAGES: Record<DataLoadError, string> = {
  file_not_found:
    'Не удалось загрузить файл geo_by_pharmacy.csv. Проверьте, что файл находится в папке public и доступен по пути /geo_by_pharmacy.csv.',
  empty_csv: 'Файл загружен, но в нём нет строк с данными.',
  missing_columns:
    'В CSV не найдены обязательные колонки: source_network, city, pharmacy_address, period_start, quantity. Проверьте маппинг колонок.',
  parse_error: 'Не удалось разобрать CSV-файл. Проверьте формат данных.',
};
