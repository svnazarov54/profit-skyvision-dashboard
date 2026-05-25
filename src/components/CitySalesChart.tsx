import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AggregatedEntity } from '../types/sales';
import { CHART_COLORS } from '../constants/colors';
import { formatNumber, formatPercent } from '../utils/formatters';
import { Card } from './ui';

interface CitySalesChartProps {
  data: AggregatedEntity[];
}

export function CitySalesChart({ data }: CitySalesChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 15 ? d.name.slice(0, 15) + '…' : d.name,
  }));

  return (
    <Card title="Продажи по городам">
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as AggregatedEntity;
                return (
                  <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-lg">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-sm text-[#6B7280]">
                      Продажи: {formatNumber(d.sales)} шт.
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      Доля: {d.sharePct.toFixed(1)}%
                    </p>
                    {d.changePct !== null && (
                      <p className="text-sm text-[#6B7280]">
                        Изменение: {formatPercent(d.changePct)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="sales"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
