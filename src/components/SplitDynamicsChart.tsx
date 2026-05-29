import { memo, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SplitChartDimension, TimeGrouping } from '../types/filters';
import type { SplitSeries } from '../types/analytics';
import { formatPeriodShort, sortPeriodKeys } from '../utils/periodGrouping';
import { formatNumber } from '../utils/formatters';
import { getSplitColor } from '../utils/pivotTable';
import {
  CHART_TOOLTIP_PROPS,
  SplitDynamicsTooltip,
  type SplitTooltipPayloadItem,
} from './chartTooltip';
import { Tip } from './Tooltip';
import { Card } from './ui';

interface SplitDynamicsChartProps {
  dimension: SplitChartDimension;
  onDimensionChange: (d: SplitChartDimension) => void;
  byNetwork: SplitSeries[];
  byRegion: SplitSeries[];
  timeGrouping: TimeGrouping;
}

export const SplitDynamicsChart = memo(function SplitDynamicsChart({
  dimension,
  onDimensionChange,
  byNetwork,
  byRegion,
  timeGrouping,
}: SplitDynamicsChartProps) {
  const series = dimension === 'network' ? byNetwork : byRegion;
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const monthKeys = useMemo(
    () =>
      sortPeriodKeys(
        new Set(series.flatMap((s) => s.points.map((p) => p.monthKey))),
        timeGrouping,
      ),
    [series, timeGrouping],
  );

  const chartData = useMemo(() => {
    return monthKeys.map((monthKey) => {
      const row: Record<string, string | number> = {
        monthKey,
        label: formatPeriodShort(monthKey, timeGrouping),
      };
      for (const s of series) {
        const point = s.points.find((p) => p.monthKey === monthKey);
        row[s.name] = point?.sales ?? 0;
      }
      return row;
    });
  }, [monthKeys, series]);

  const toggleSeries = (name: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Card
      title="Динамика по разрезам"
      action={
        <div className="flex rounded-lg border border-[#E5E7EB] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              onDimensionChange('network');
              setHidden(new Set());
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              dimension === 'network'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            По сетям
          </button>
          <button
            type="button"
            onClick={() => {
              onDimensionChange('region');
              setHidden(new Set());
            }}
            className={`rounded-md px-3 py-1 font-medium transition ${
              dimension === 'region'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            По регионам
          </button>
        </div>
      }
    >
      {series.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {series.map((s, i) => {
              const isHidden = hidden.has(s.name);
              const color = getSplitColor(i);
              const label = s.name.length > 28 ? s.name.slice(0, 28) + '…' : s.name;
              return (
                <Tip key={s.name} content={`${s.name} · ${formatNumber(s.total)} шт. всего`}>
                  <button
                    type="button"
                    onClick={() => toggleSeries(s.name)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      isHidden
                        ? 'border-[#E5E7EB] bg-[#F8FAFC] text-[#9CA3AF] line-through'
                        : 'border-[#E5E7EB] bg-white text-[#111827] hover:border-[#2563EB]'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isHidden ? '#D1D5DB' : color }}
                    />
                    {label}
                  </button>
                </Tip>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                shared
                offset={0}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{
                  ...CHART_TOOLTIP_PROPS.wrapperStyle,
                  pointerEvents: 'none',
                }}
                content={({ active, payload, label, coordinate, viewBox }) => (
                  <SplitDynamicsTooltip
                    active={active}
                    payload={payload as SplitTooltipPayloadItem[] | undefined}
                    label={label}
                    coordinate={coordinate}
                    viewBox={viewBox}
                    hiddenSeries={hidden}
                  />
                )}
              />
              {series.map((s, i) =>
                hidden.has(s.name) ? null : (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    name={s.name}
                    stroke={getSplitColor(i)}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    hide={hidden.has(s.name)}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-[#6B7280]">
            Нажмите на название в легенде, чтобы скрыть или показать линию
          </p>
        </>
      )}
    </Card>
  );
});
