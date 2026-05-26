import type { ColumnMapping } from '../types/sales';

export const COLUMN_MAPPING: ColumnMapping = {
  network: 'source_network',
  city: 'city',
  fullCity: 'full_city',
  federalSubject: 'federal_subject',
  address: 'pharmacy_address',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  product: 'brand',
  sku: 'sku',
  salesCount: 'quantity',
};

export const FALLBACK_MAPPING: Partial<Record<keyof ColumnMapping, string[]>> = {
  network: ['pharmacy_network'],
  periodStart: ['month_year'],
  product: ['product_raw'],
  sku: ['product_raw'],
  salesCount: ['sales_count'],
};

export const REQUIRED_COLUMNS = [
  'source_network',
  'city',
  'pharmacy_address',
  'period_start',
  'quantity',
] as const;

export const CSV_PATH = '/geo_by_pharmacy.csv';

export const EMPTY_VALUES = {
  network: 'Не указана сеть',
  city: 'Не указан город',
  federalSubject: 'Не указан регион',
  address: 'Не указан адрес',
  product: 'Не указан продукт',
  sku: 'Не указан SKU',
} as const;
