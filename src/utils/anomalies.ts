import type { AnomalyItem, SalesRecord } from '../types/sales';
import { THRESHOLDS } from '../constants/thresholds';
import {
  aggregateByKey,
  buildPointMetrics,
  calcChange,
  splitByPeriod,
} from './analytics';
import { formatPointLabel } from './formatters';

function classifySeverity(
  changePct: number | null,
  previousSales: number,
): 'critical' | 'warning' | null {
  if (changePct === null || previousSales < THRESHOLDS.minPreviousSales) {
    return null;
  }
  if (changePct <= THRESHOLDS.anomalyCritical) return 'critical';
  if (changePct <= THRESHOLDS.anomalyWarning) return 'warning';
  return null;
}

function makeAnomaly(
  id: string,
  level: AnomalyItem['level'],
  severity: 'critical' | 'warning',
  title: string,
  previousSales: number,
  currentSales: number,
  changePct: number,
  changeAbs: number,
): AnomalyItem {
  const severityLabel = severity === 'critical' ? 'Критический спад' : 'Предупреждение';
  return {
    id,
    level,
    severity,
    title: `${severityLabel}: ${title}`,
    description: `Продажи снизились на ${Math.abs(changePct).toFixed(1)}%: ${Math.round(previousSales).toLocaleString('ru-RU')} → ${Math.round(currentSales).toLocaleString('ru-RU')} шт.`,
    changePct,
    changeAbs,
    previousSales,
    currentSales,
  };
}

export function detectAnomalies(
  records: SalesRecord[],
  period: { from: string; to: string },
): AnomalyItem[] {
  const { current, previous } = splitByPeriod(records, period);
  const anomalies: AnomalyItem[] = [];

  // Monthly anomalies
  const currentMonths = aggregateByKey(current, (r) => r.monthKey);
  const prevMonths = aggregateByKey(previous, (r) => r.monthKey);
  const sortedMonths = [...currentMonths.keys()].sort();

  for (let i = 0; i < sortedMonths.length; i++) {
    const monthKey = sortedMonths[i];
    const sales = currentMonths.get(monthKey) ?? 0;
    const prev =
      i > 0
        ? (currentMonths.get(sortedMonths[i - 1]) ?? 0)
        : (prevMonths.get(monthKey) ?? 0);
    const { changePct, changeAbs } = calcChange(sales, prev);
    const severity = classifySeverity(changePct, prev);
    if (severity) {
      anomalies.push(
        makeAnomaly(
          `month-${monthKey}`,
          'month',
          severity,
          `Месяц ${monthKey}`,
          prev,
          sales,
          changePct!,
          changeAbs,
        ),
      );
    }
  }

  // Network anomalies
  const networkCurrent = aggregateByKey(current, (r) => r.network);
  const networkPrev = aggregateByKey(previous, (r) => r.network);
  for (const [network, sales] of networkCurrent) {
    const prev = networkPrev.get(network) ?? 0;
    const { changePct, changeAbs } = calcChange(sales, prev);
    const severity = classifySeverity(changePct, prev);
    if (severity) {
      anomalies.push(
        makeAnomaly(
          `network-${network}`,
          'network',
          severity,
          network,
          prev,
          sales,
          changePct!,
          changeAbs,
        ),
      );
    }
  }

  // City anomalies
  const cityCurrent = aggregateByKey(current, (r) => r.city);
  const cityPrev = aggregateByKey(previous, (r) => r.city);
  for (const [city, sales] of cityCurrent) {
    const prev = cityPrev.get(city) ?? 0;
    const { changePct, changeAbs } = calcChange(sales, prev);
    const severity = classifySeverity(changePct, prev);
    if (severity) {
      anomalies.push(
        makeAnomaly(
          `city-${city}`,
          'city',
          severity,
          city,
          prev,
          sales,
          changePct!,
          changeAbs,
        ),
      );
    }
  }

  // Point anomalies
  const points = buildPointMetrics(current, previous, 1);
  for (const p of points) {
    const prev = p.changePct !== null ? p.sales - p.changeAbs : 0;
    const severity = classifySeverity(p.changePct, prev);
    if (severity) {
      anomalies.push(
        makeAnomaly(
          `point-${p.pointId}`,
          'point',
          severity,
          formatPointLabel(p.network, p.city, p.address),
          prev,
          p.sales,
          p.changePct!,
          p.changeAbs,
        ),
      );
    }
  }

  return anomalies.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    if (a.changePct !== b.changePct) return a.changePct - b.changePct;
    return a.changeAbs - b.changeAbs;
  });
}
