import type { InsightItem, MonthlySales, PointMetrics, SalesRecord } from '../types/sales';
import type { KpiData } from '../types/analytics';
import { THRESHOLDS } from '../constants/thresholds';
import {
  aggregateByKey,
  calcChange,
  getLastTwoMonths,
  splitByPeriod,
} from './analytics';

export function generateInsights(
  records: SalesRecord[],
  period: { from: string; to: string },
  kpi: KpiData,
  monthly: MonthlySales[],
  pointMetrics: PointMetrics[],
): InsightItem[] {
  const insights: InsightItem[] = [];
  const { current, previous } = splitByPeriod(records, period);

  // Critical points count
  const criticalPoints = pointMetrics.filter(
    (p) => p.changePct !== null && p.changePct <= THRESHOLDS.anomalyCritical,
  );
  if (criticalPoints.length > 0) {
    insights.push({
      id: 'critical-points',
      priority: 1,
      type: 'critical',
      text: `${criticalPoints.length} аптечных ${criticalPoints.length === 1 ? 'точка находится' : 'точек находятся'} в зоне критического спада.`,
    });
  }

  // Overall trend (last month vs previous)
  const { last, previous: prevMonth } = getLastTwoMonths(monthly);
  if (last && prevMonth) {
    const { changePct } = calcChange(last.sales, prevMonth.sales);
    if (changePct !== null) {
      const direction = changePct >= 0 ? 'выросли' : 'снизились';
      insights.push({
        id: 'month-trend',
        priority: 2,
        type: 'trend',
        text: `Продажи в последнем месяце ${direction} на ${Math.abs(changePct).toFixed(1)}% относительно предыдущего месяца.`,
      });
    }
  }

  // Leader network
  if (kpi.bestNetwork) {
    insights.push({
      id: 'leader-network',
      priority: 3,
      type: 'leader',
      text: `Сеть «${kpi.bestNetwork.name}» — лидер продаж: ${kpi.bestNetwork.sharePct.toFixed(1)}% от общего объёма.`,
    });
  }

  // Max growth entity
  const cityCurrent = aggregateByKey(current, (r) => r.city);
  const cityPrev = aggregateByKey(previous, (r) => r.city);
  let maxGrowth: { name: string; changePct: number } | null = null;

  for (const [city, sales] of cityCurrent) {
    const prev = cityPrev.get(city) ?? 0;
    if (prev >= THRESHOLDS.minPreviousSales) {
      const { changePct } = calcChange(sales, prev);
      if (changePct !== null && changePct > 0) {
        if (!maxGrowth || changePct > maxGrowth.changePct) {
          maxGrowth = { name: city, changePct };
        }
      }
    }
  }

  if (maxGrowth) {
    insights.push({
      id: 'max-growth',
      priority: 4,
      type: 'growth',
      text: `Максимальный рост показал город ${maxGrowth.name}: +${maxGrowth.changePct.toFixed(1)}% к предыдущему периоду.`,
    });
  }

  // Worst city
  let worstCity: { name: string; changePct: number } | null = null;
  for (const [city, sales] of cityCurrent) {
    const prev = cityPrev.get(city) ?? 0;
    if (prev >= THRESHOLDS.minPreviousSales) {
      const { changePct } = calcChange(sales, prev);
      if (changePct !== null && changePct < 0) {
        if (!worstCity || changePct < worstCity.changePct) {
          worstCity = { name: city, changePct };
        }
      }
    }
  }

  if (worstCity) {
    insights.push({
      id: 'worst-city',
      priority: 5,
      type: 'decline',
      text: `Самая слабая динамика среди городов — в ${worstCity.name}: ${worstCity.changePct.toFixed(1)}%.`,
    });
  }

  // Top-5 concentration
  const sortedPoints = [...pointMetrics].sort((a, b) => b.sales - a.sales);
  const top5 = sortedPoints.slice(0, 5);
  const top5Share = top5.reduce((s, p) => s + p.sharePct, 0);
  if (top5Share > 0) {
    insights.push({
      id: 'concentration',
      priority: 6,
      type: 'concentration',
      text: `На топ-5 аптечных точек приходится ${top5Share.toFixed(1)}% всех продаж.`,
    });
  }

  // Max decline point
  const declining = pointMetrics
    .filter((p) => p.changePct !== null && p.changePct < 0)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));

  if (declining.length > 0) {
    const worst = declining[0];
    insights.push({
      id: 'worst-point',
      priority: 7,
      type: 'decline',
      text: `Самое сильное падение у точки «${worst.address}»: ${worst.changePct!.toFixed(1)}%.`,
    });
  }

  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, THRESHOLDS.maxInsights);
}
