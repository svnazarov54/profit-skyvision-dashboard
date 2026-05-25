import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { AnomalyItem, InsightItem } from '../types/sales';
import { Card } from './ui';

interface InsightsPanelProps {
  insights: InsightItem[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <Card title="Инсайты">
      {insights.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6B7280]">Нет инсайтов</p>
      ) : (
        <ul className="space-y-3">
          {insights.map((item) => (
            <li key={item.id} className="flex gap-3">
              <Lightbulb
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  item.type === 'critical'
                    ? 'text-[#DC2626]'
                    : item.type === 'trend'
                      ? 'text-[#2563EB]'
                      : 'text-[#F97316]'
                }`}
              />
              <p className="text-sm text-[#111827]">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface AnomaliesPanelProps {
  anomalies: AnomalyItem[];
}

export function AnomaliesPanel({ anomalies }: AnomaliesPanelProps) {
  const displayed = anomalies.slice(0, 10);

  return (
    <Card title="Провалы и аномалии">
      {displayed.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6B7280]">
          Аномалий не обнаружено
        </p>
      ) : (
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {displayed.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border p-3 ${
                a.severity === 'critical'
                  ? 'border-red-200 bg-red-50'
                  : 'border-orange-200 bg-orange-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    a.severity === 'critical' ? 'text-[#DC2626]' : 'text-[#F97316]'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-[#111827]">{a.title}</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">{a.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
