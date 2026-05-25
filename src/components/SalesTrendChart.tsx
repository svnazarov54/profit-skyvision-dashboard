import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlySalesWithYoy } from '../types/analytics';
import { CHART_COLORS } from '../constants/colors';
import { formatMonthShort } from '../utils/dateUtils';
import { formatNumber, formatPercent } from '../utils/formatters';
import { CHART_TOOLTIP_PROPS, ChartTooltipPanel, ChartTooltipRow } from './chartTooltip';
import { Card } from './ui';

interface SalesTrendChartProps {
  data: MonthlySalesWithYoy[];
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthShort(d.monthKey),
    yoyValue: d.yoySales ?? undefined,
  }));

  return (
    <Card title="Динамика продаж по месяцам">
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as MonthlySalesWithYoy & { label: string };
                  return (
                    <ChartTooltipPanel title={d.monthLabel}>
                      <ChartTooltipRow
                        label="Продажи"
                        value={`${formatNumber(d.sales)} шт.`}
                        color={CHART_COLORS.primary}
                      />
                      {d.yoySales !== null && (
                        <ChartTooltipRow
                          label="YoY"
                          value={`${formatNumber(d.yoySales)} шт.${d.yoyChangePct !== null ? ` (${formatPercent(d.yoyChangePct)})` : ''}`}
                          color="#111827"
                        />
                      )}
                      {d.changePct !== null && (
                        <ChartTooltipRow
                          label="MoM"
                          value={formatPercent(d.changePct)}
                        />
                      )}
                    </ChartTooltipPanel>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={{ r: 3, fill: CHART_COLORS.primary }}
              />
              <Line
                type="monotone"
                dataKey="yoyValue"
                name="YoY"
                stroke="#111827"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-[#6B7280]">
            <span className="mr-2 inline-block h-0.5 w-5 border-t-2 border-dashed border-[#111827]" />
            Чёрный пунктир — продажи год назад (YoY)
          </p>
        </>
      )}
    </Card>
  );
}
