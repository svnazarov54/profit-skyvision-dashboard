import type { PointMetrics } from '../types/sales';

export function exportPointsToCsv(points: PointMetrics[], filename = 'pharmacy_points.csv'): void {
  const headers = [
    'Аптечная сеть',
    'Город',
    'Регион',
    'Адрес',
    'Продажи',
    'Изменение %',
    'Изменение шт.',
    'Доля %',
    'Статус',
  ];

  const rows = points.map((p) => [
    p.network,
    p.city,
    p.federalSubject,
    p.address,
    String(p.sales),
    p.changePct !== null ? p.changePct.toFixed(1) : '',
    String(p.changeAbs),
    p.sharePct.toFixed(1),
    p.status,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
