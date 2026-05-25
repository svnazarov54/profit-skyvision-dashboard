import type { ReactNode } from 'react';
import { Building2, Globe2, Store, TrendingDown, TrendingUp } from 'lucide-react';
import type { KpiData } from '../types/analytics';
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
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
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

interface KpiCardsProps {
  kpi: KpiData;
  hasData: boolean;
}

export function KpiCards({ kpi, hasData }: KpiCardsProps) {
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

  const { momChange } = kpi;
  const changeAccent =
    !momChange.hasBase
      ? 'neutral'
      : (momChange.changePct ?? 0) > 0
        ? 'success'
        : (momChange.changePct ?? 0) < THRESHOLDS.anomalyCritical
          ? 'danger'
          : (momChange.changePct ?? 0) < 0
            ? 'warning'
            : 'neutral';

  const momSubtitle = momChange.hasBase
    ? `${momChange.changeAbs >= 0 ? '+' : ''}${formatNumber(momChange.changeAbs)} шт. · ${momChange.previousMonthLabel} → ${momChange.lastMonthLabel}`
    : 'Нет базы для сравнения';

  const bestNetworkSubtitle = kpi.bestNetwork
    ? `${formatSales(kpi.bestNetwork.sales)} · ${kpi.bestNetwork.sharePct.toFixed(1)}%`
    : undefined;

  const bestRegionSubtitle = kpi.bestRegion
    ? `${formatSales(kpi.bestRegion.sales)} · ${kpi.bestRegion.sharePct.toFixed(1)}%`
    : undefined;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Общие продажи"
        value={formatSales(kpi.totalSales)}
        hint="Сумма продаж за выбранный период и фильтры"
        icon={<Store className="h-4 w-4" />}
      />
      <KpiCard
        title="Изменение MoM"
        value={
          momChange.hasBase && momChange.changePct !== null
            ? formatPercent(momChange.changePct)
            : '—'
        }
        subtitle={momSubtitle}
        hint="Сравнение последнего месяца периода с предыдущим"
        icon={
          (momChange.changePct ?? 0) < 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )
        }
        accent={changeAccent}
      />
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
}
