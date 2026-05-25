import { Tip } from './Tooltip';

export function CellBarValue({
  value,
  monthTotal,
  monthLabel,
}: {
  value: number;
  monthTotal: number;
  monthLabel?: string;
}) {
  if (!value) {
    return <span className="text-[#D1D5DB]">—</span>;
  }

  const share = monthTotal > 0 ? (value / monthTotal) * 100 : 0;
  const tipText = monthLabel
    ? `${monthLabel}: ${value.toLocaleString('ru-RU')} шт. · ${share.toFixed(1)}% от суммы за месяц`
    : `${value.toLocaleString('ru-RU')} шт.`;

  return (
    <Tip content={tipText}>
      <div className="min-w-[84px] cursor-default">
        <div className="mb-0.5 text-right text-xs font-medium tabular-nums text-[#111827]">
          {value.toLocaleString('ru-RU')}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#F1F5F9]">
          <div
            className="h-full rounded-full bg-[#2563EB]/50"
            style={{ width: `${Math.max(share, share > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>
    </Tip>
  );
}

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  values,
  width = 72,
  height = 24,
  color = '#2563EB',
}: SparklineProps) {
  const chart = !values.length || values.every((v) => v === 0) ? (
    <svg width={width} height={height} className="opacity-30">
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#D1D5DB" strokeWidth={1} />
    </svg>
  ) : (
    (() => {
      const max = Math.max(...values, 1);
      const min = Math.min(...values, 0);
      const range = max - min || 1;
      const step = values.length > 1 ? width / (values.length - 1) : 0;
      const points = values
        .map((v, i) => {
          const x = i * step;
          const y = height - ((v - min) / range) * (height - 4) - 2;
          return `${x},${y}`;
        })
        .join(' ');
      const last = values[values.length - 1];
      const prev = values.length > 1 ? values[values.length - 2] : last;
      const trendColor = last >= prev ? '#16A34A' : '#DC2626';

      return (
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
          <circle
            cx={(values.length - 1) * step}
            cy={height - ((last - min) / range) * (height - 4) - 2}
            r={2.5}
            fill={trendColor}
          />
        </svg>
      );
    })()
  );

  return (
    <Tip content="Динамика продаж по месяцам в этой строке. Зелёная точка — рост, красная — падение.">
      <span className="inline-flex cursor-default">{chart}</span>
    </Tip>
  );
}

function MomBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <Tip content="Недостаточно данных для сравнения с предыдущим месяцем">
        <span className="cursor-default text-xs text-[#9CA3AF]">—</span>
      </Tip>
    );
  }

  const positive = pct >= 0;
  return (
    <Tip content={`Изменение последнего месяца к предыдущему: ${positive ? '+' : ''}${pct.toFixed(1)}%`}>
      <span
        className={`inline-flex cursor-default items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
          positive ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#DC2626]'
        }`}
      >
        {positive ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    </Tip>
  );
}

export function MomDeltaCell({
  monthly,
  months,
}: {
  monthly: Record<string, number>;
  months: string[];
}) {
  if (months.length < 2) return <MomBadge pct={null} />;

  const lastKey = months[months.length - 1];
  const prevKey = months[months.length - 2];
  const last = monthly[lastKey] ?? 0;
  const prev = monthly[prevKey] ?? 0;

  if (prev === 0) return <MomBadge pct={null} />;

  const pct = ((last - prev) / prev) * 100;
  return <MomBadge pct={pct} />;
}
