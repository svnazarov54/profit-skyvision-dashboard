export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatSales(value: number): string {
  return `${formatNumber(value)} шт.`;
}

export function formatPercent(value: number | null, showSign = true): string {
  if (value === null) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 1)}%`;
}

export function formatChange(
  changePct: number | null,
  changeAbs: number,
): string {
  if (changePct === null) return 'Нет базы для сравнения';
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${formatNumber(changePct, 1)}% · ${sign}${formatNumber(changeAbs)} шт.`;
}

export function formatShare(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatPointLabel(
  network: string,
  city: string,
  address: string,
): string {
  return `${network} · ${city} · ${address}`;
}

export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

export function parseSalesCount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
