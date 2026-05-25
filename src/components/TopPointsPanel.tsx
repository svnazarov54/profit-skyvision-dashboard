import type { PointMetrics } from '../types/sales';
import { formatNumber, formatPointLabel } from '../utils/formatters';
import { Tip } from './Tooltip';
import { Card } from './ui';

interface TopPointsPanelProps {
  topPoints: PointMetrics[];
}

export function TopPointsPanel({ topPoints }: TopPointsPanelProps) {
  return (
    <Card title="Топ-5 аптечных точек">
      {topPoints.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <ol className="space-y-3">
          {topPoints.map((p, i) => {
            const label = formatPointLabel(p.network, p.city, p.address);
            return (
              <li key={p.pointId} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-xs font-bold text-[#2563EB]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Tip content={label} maxWidth={360}>
                    <p className="truncate text-sm font-medium text-[#111827]">{label}</p>
                  </Tip>
                  <p className="text-xs text-[#6B7280]">
                    {formatNumber(p.sales)} шт. · {p.sharePct.toFixed(1)}% от общего объёма
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
