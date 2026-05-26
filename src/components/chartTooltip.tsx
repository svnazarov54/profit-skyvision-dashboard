import type { ReactNode } from 'react';
import { formatNumber } from '../utils/formatters';

/** Used only to decide left/right flip near chart edge */
const SPLIT_TOOLTIP_EST_WIDTH = 260;
const SPLIT_TOOLTIP_GAP = 8;
/** Vertical offset from the hovered point — small gap below, near the cursor */
const SPLIT_TOOLTIP_OFFSET_Y = 10;

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

export interface SplitTooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface SplitTooltipProps {
  active?: boolean;
  payload?: SplitTooltipPayloadItem[];
  label?: string | number;
  coordinate?: { x?: number; y?: number };
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  hiddenSeries: Set<string>;
}

/** Shared tooltip for split dynamics — all series at hovered month, flips near chart edges */
export function SplitDynamicsTooltip({
  active,
  payload,
  label,
  coordinate,
  viewBox,
  hiddenSeries,
}: SplitTooltipProps) {
  if (!active || !payload?.length || !coordinate) return null;

  const items = payload
    .filter((p) => p.name != null && !hiddenSeries.has(String(p.name)))
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));

  if (!items.length) return null;

  const vb = {
    x: viewBox?.x ?? 0,
    y: viewBox?.y ?? 0,
    width: viewBox?.width ?? 400,
    height: viewBox?.height ?? 300,
  };
  const cx = coordinate.x ?? 0;
  const chartRight = vb.x + vb.width;

  // Right of point by default; flip so the box sits immediately to the left of the point
  const placeLeft = cx + SPLIT_TOOLTIP_GAP + SPLIT_TOOLTIP_EST_WIDTH > chartRight - 4;
  const translateX = placeLeft
    ? `calc(-100% - ${SPLIT_TOOLTIP_GAP}px)`
    : `${SPLIT_TOOLTIP_GAP}px`;
  const translateY = `${SPLIT_TOOLTIP_OFFSET_Y}px`;

  return (
    <div
      className="pointer-events-none w-max min-w-[200px] max-w-[min(320px,calc(100vw-2rem))]"
      style={{
        transform: `translate(${translateX}, ${translateY})`,
      }}
    >
      <ChartTooltipPanel title={String(label)}>
        <div className="space-y-1">
          {items.map((p) => (
            <ChartTooltipRow
              key={String(p.dataKey ?? p.name)}
              label={String(p.name)}
              value={`${formatNumber(Number(p.value ?? 0))} шт.`}
              color={String(p.color ?? '#2563EB')}
            />
          ))}
        </div>
      </ChartTooltipPanel>
    </div>
  );
}
