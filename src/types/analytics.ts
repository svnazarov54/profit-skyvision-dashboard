import type { AggregatedEntity, MonthlySales, PointMetrics, SalesRecord } from './sales';

export interface MomChange {
  changeAbs: number;
  changePct: number | null;
  hasBase: boolean;
  lastMonthLabel: string | null;
  previousMonthLabel: string | null;
}

export interface KpiData {
  totalSales: number;
  momChange: MomChange;
  yoyChange: MomChange;
  bestNetwork: {
    name: string;
    sales: number;
    sharePct: number;
  } | null;
  bestRegion: {
    name: string;
    sales: number;
    sharePct: number;
  } | null;
}

export interface MonthlySalesWithYoy extends MonthlySales {
  yoySales: number | null;
  yoyChangePct: number | null;
}

export interface SplitSeries {
  name: string;
  total: number;
  points: { monthKey: string; sales: number }[];
}

export type PivotLevel = 'network' | 'region' | 'city' | 'pharmacy';

export interface PivotNode {
  id: string;
  label: string;
  level: PivotLevel;
  /** Sales by month for the selected period only */
  monthly: Record<string, number>;
  /** Sales by month without period filter — used as YoY baseline */
  yoyMonthly: Record<string, number>;
  total: number;
  children: PivotNode[];
}

export interface DashboardAnalytics {
  kpi: KpiData;
  monthlySales: MonthlySalesWithYoy[];
  avgMonthlySales: number;
  networkSales: AggregatedEntity[];
  regionSales: AggregatedEntity[];
  topPoints: PointMetrics[];
  splitByNetwork: SplitSeries[];
  splitByRegion: SplitSeries[];
  pivotMonths: string[];
  pivotTree: PivotNode[];
  currentRecords: SalesRecord[];
  dateRange: { from: string; to: string } | null;
  filteredRowCount: number;
}
