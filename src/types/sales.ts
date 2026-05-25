export interface ColumnMapping {
  network: string;
  city: string;
  fullCity: string;
  federalSubject: string;
  address: string;
  periodStart: string;
  periodEnd: string;
  product: string;
  salesCount: string;
}

export interface SalesRecord {
  network: string;
  city: string;
  fullCity: string;
  federalSubject: string;
  address: string;
  periodStart: Date;
  periodEnd: Date | null;
  product: string;
  salesCount: number;
  monthKey: string;
  pointId: string;
}

export type GrowthStatus =
  | 'Рост'
  | 'Стабильно'
  | 'Спад'
  | 'Критический спад'
  | 'Нет базы';

export interface ChangeMetrics {
  changeAbs: number;
  changePct: number | null;
}

export interface PointMetrics extends ChangeMetrics {
  pointId: string;
  network: string;
  city: string;
  fullCity: string;
  federalSubject: string;
  address: string;
  sales: number;
  sharePct: number;
  status: GrowthStatus;
  product?: string;
}

export interface AggregatedEntity extends ChangeMetrics {
  name: string;
  sales: number;
  sharePct: number;
}

export interface MonthlySales {
  monthKey: string;
  monthLabel: string;
  sales: number;
  changeAbs: number | null;
  changePct: number | null;
}

export interface AnomalyItem {
  id: string;
  level: 'month' | 'network' | 'city' | 'point' | 'product';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  changePct: number;
  changeAbs: number;
  previousSales: number;
  currentSales: number;
}

export interface InsightItem {
  id: string;
  priority: number;
  text: string;
  type: 'critical' | 'trend' | 'leader' | 'growth' | 'decline' | 'concentration' | 'info';
}

export type DataLoadError =
  | 'file_not_found'
  | 'empty_csv'
  | 'missing_columns'
  | 'parse_error';

export interface DataLoadState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: DataLoadError;
  errorMessage?: string;
  rowCount?: number;
}
