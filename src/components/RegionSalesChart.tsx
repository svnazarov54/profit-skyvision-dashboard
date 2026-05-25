import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AggregatedEntity } from '../types/sales';
import { CHART_COLORS } from '../constants/colors';
import { formatNumber, formatPercent } from '../utils/formatters';
import { CHART_TOOLTIP_PROPS, ChartTooltipPanel, ChartTooltipRow } from './chartTooltip';
import { Card } from './ui';

interface RegionSalesChartProps {
  data: AggregatedEntity[];
}

export function RegionSalesChart({ data }: RegionSalesChartProps) {
  const chartData = data.slice(0, 15).map((d) => ({
    ...d,
    shortName: d.name.length > 30 ? d.name.slice(0, 30) + '…' : d.name,
  }));

  return (
    <Card title="Продажи по субъектам РФ">
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 36)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 56, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              width={160}
              tick={{ fontSize: 11, fill: '#6B7280' }}
            />
            <Tooltip
              {...CHART_TOOLTIP_PROPS}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as AggregatedEntity;
                return (
                  <ChartTooltipPanel title={d.name}>
                    <ChartTooltipRow label="Продажи" value={`${formatNumber(d.sales)} шт.`} />
                    <ChartTooltipRow label="Доля" value={`${d.sharePct.toFixed(1)}%`} />
                    {d.changePct !== null && (
                      <ChartTooltipRow label="Изменение" value={formatPercent(d.changePct)} />
                    )}
                  </ChartTooltipPanel>
                );
              }}
            />
            <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="sales"
                position="right"
                formatter={(v: number) => formatNumber(v)}
                style={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={index === 0 ? CHART_COLORS.primary : CHART_COLORS.primaryMuted}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
