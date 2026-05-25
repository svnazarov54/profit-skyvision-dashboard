import type { ReactNode } from 'react';

interface ChartTooltipProps {
  title?: string;
  children: ReactNode;
}

export function ChartTooltipPanel({ title, children }: ChartTooltipProps) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 shadow-xl">
      {title && (
        <p className="mb-1.5 border-b border-[#F3F4F6] pb-1.5 text-sm font-semibold text-[#111827]">
          {title}
        </p>
      )}
      <div className="space-y-1 text-sm text-[#6B7280]">{children}</div>
    </div>
  );
}

export function ChartTooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-[#111827]">
        {color && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </span>
      <span className="font-medium tabular-nums text-[#111827]">{value}</span>
    </div>
  );
}

/** Recharts Tooltip props for instant, non-animated tooltips */
export const CHART_TOOLTIP_PROPS = {
  isAnimationActive: false,
  cursor: { fill: 'rgba(37, 99, 235, 0.06)' },
  wrapperStyle: { outline: 'none', zIndex: 50 },
} as const;
