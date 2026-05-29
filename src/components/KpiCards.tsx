import { memo, type ReactNode } from 'react';
import { Building2, Globe2, Store } from 'lucide-react';
import type { TimeGrouping } from '../types/filters';
import type { KpiData, MomChange } from '../types/analytics';
import { getPeriodComparisonLabel } from '../utils/periodGrouping';
import { THRESHOLDS } from '../constants/thresholds';
import { formatNumber, formatPercent, formatSales } from '../utils/formatters';
import { Hint, Tip } from './Tooltip';
import { Card } from './ui';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  accent?: 'neutral' | 'success' | 'danger' | 'warning' | 'primary';
  hint?: string;
  valueTip?: string;
}

function KpiCard({ title, value, subtitle, icon, accent = 'neutral', hint, valueTip }: KpiCardProps) {
  const accentColors = {
    neutral: 'text-[#111827]',
    success: 'text-[#16A34A]',
    danger: 'text-[#DC2626]',
    warning: 'text-[#F97316]',
    primary: 'text-[#2563EB]',
  };

  const valueEl = (
    <p className={`mt-1 truncate text-xl font-bold md:text-2xl ${accentColors[accent]}`}>
      {value}
    </p>
  );

  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#374151]">
            {title}
            {hint && <Hint text={hint} />}
          </p>
          {valueTip ? (
            <Tip content={valueTip} className="block w-full">
              {valueEl}
            </Tip>
          ) : (
            valueEl
          )}
          {subtitle && (
            <Tip content={subtitle} className="block w-full">
              <p className="mt-1 truncate text-xs text-[#6B7280]">{subtitle}</p>
            </Tip>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#2563EB]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function changeAccent(changePct: number | null, hasBase: boolean) {
  if (!hasBase) return 'neutral' as const;
  if ((changePct ?? 0) > 0) return 'success' as const;
  if ((changePct ?? 0) < THRESHOLDS.anomalyCritical) return 'danger' as const;
  if ((changePct ?? 0) < 0) return 'warning' as const;
  return 'neutral' as const;
}

function ChangeMetric({
  title,
  change,
  hint,
}: {
  title: string;
  change: MomChange;
  hint: string;
}) {
  const accent = changeAccent(change.changePct, change.hasBase);
  const accentColors = {
    neutral: 'text-[#111827]',
    success: 'text-[#16A34A]',
    danger: 'text-[#DC2626]',
    warning: 'text-[#F97316]',
  };

  const subtitle = change.hasBase
    ? `${change.changeAbs >= 0 ? '+' : ''}${formatNumber(change.changeAbs)} шт. · ${change.previousMonthLabel} → ${change.lastMonthLabel}`
    : 'Нет базы для сравнения';

  return (
    <div className="min-w-0 flex-1 border-[#E5E7EB] pl-4 first:border-0 first:pl-0 sm:border-l">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#374151]">
        {title}
        <Hint text={hint} />
      </p>
      <p className={`mt-1 truncate text-xl font-bold md:text-2xl ${accentColors[accent]}`}>
        {change.hasBase && change.changePct !== null ? formatPercent(change.changePct) : '—'}
      </p>
      <p className="mt-1 truncate text-xs text-[#6B7280]">{subtitle}</p>
    </div>
  );
}

interface KpiCardsProps {
  kpi: KpiData;
  hasData: boolean;
  timeGrouping: TimeGrouping;
}

export const KpiCards = memo(function KpiCards({ kpi, hasData, timeGrouping }: KpiCardsProps) {
  const sequentialLabel = getPeriodComparisonLabel(timeGrouping);
  const showSequential = timeGrouping !== 'year';
  if (!hasData) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCard
            key={i}
            title="—"
            value="0 шт."
            subtitle="Нет данных"
            icon={<Store className="h-4 w-4" />}
          />
        ))}
      </div>
    );
  }

  const bestNetworkSubtitle = kpi.bestNetwork
    ? `${formatSales(kpi.bestNetwork.sales)} · ${kpi.bestNetwork.sharePct.toFixed(1)}%`
    : undefined;

  const bestRegionSubtitle = kpi.bestRegion
    ? `${formatSales(kpi.bestRegion.sales)} · ${kpi.bestRegion.sharePct.toFixed(1)}%`
    : undefined;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="!p-4 sm:col-span-2 xl:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 sm:max-w-[38%]">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#374151]">
              Общие продажи
              <Hint text="Сумма продаж за выбранный период и фильтры" />
            </p>
            <p className="mt-1 text-xl font-bold text-[#111827] md:text-2xl">
              {formatSales(kpi.totalSales)}
            </p>
          </div>
          {showSequential && (
            <ChangeMetric
              title={`Изменение ${sequentialLabel}`}
              change={kpi.momChange}
              hint={
                timeGrouping === 'quarter'
                  ? 'Сравнение последнего квартала периода с предыдущим'
                  : 'Сравнение последнего месяца периода с предыдущим'
              }
            />
          )}
          <ChangeMetric
            title="Изменение YoY"
            change={kpi.yoyChange}
            hint={
              timeGrouping === 'year'
                ? 'Сравнение последнего года периода с предыдущим'
                : timeGrouping === 'quarter'
                  ? 'Сравнение последнего квартала с тем же кварталом год назад'
                  : 'Сравнение последнего месяца периода с тем же месяцем год назад'
            }
          />
        </div>
      </Card>
      <KpiCard
        title="Лучшая аптечная сеть"
        value={kpi.bestNetwork?.name ?? '—'}
        subtitle={bestNetworkSubtitle}
        valueTip={kpi.bestNetwork?.name}
        hint="Сеть с наибольшим объёмом продаж"
        icon={<Building2 className="h-4 w-4" />}
        accent="primary"
      />
      <KpiCard
        title="Лучший субъект РФ"
        value={kpi.bestRegion?.name ?? '—'}
        subtitle={bestRegionSubtitle}
        valueTip={kpi.bestRegion?.name}
        hint="Субъект РФ с наибольшим объёмом продаж"
        icon={<Globe2 className="h-4 w-4" />}
        accent="primary"
      />
    </div>
  );
});
