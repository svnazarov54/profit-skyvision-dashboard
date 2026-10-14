import { ChevronDown, FileWarning, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import type { DataCompleteness } from '../types/dataCompleteness';

const MONTH_NAMES = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const;

function monthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const name = MONTH_NAMES[month - 1];
  return name && year ? `${name} ${year}` : period;
}

function networkWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'сетей';
  if (mod10 === 1) return 'сеть';
  if (mod10 >= 2 && mod10 <= 4) return 'сети';
  return 'сетей';
}

interface DataCompletenessNoticeProps {
  data: DataCompleteness | null;
}

export function DataCompletenessNotice({ data }: DataCompletenessNoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  if (!data || data.status !== 'preliminary' || data.missingNetworks.length === 0) {
    return null;
  }

  const reportingMonth = monthLabel(data.reportingMonth);
  const comparisonMonth = monthLabel(data.comparisonMonth);
  const missingCount = data.missingNetworks.length;

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-amber-950 shadow-sm">
      <button
        type="button"
        className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-amber-100/70 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-inset"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {reportingMonth.charAt(0).toUpperCase() + reportingMonth.slice(1)} — предварительные данные
          </span>
          <span className="mt-0.5 block text-sm text-amber-900/80">
            Отчёты есть по {data.reportedNetworkCount} из {data.comparisonNetworkCount} сетей,
            представленных за {comparisonMonth}.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm font-semibold text-amber-800">
          <span className="hidden sm:inline">
            {expanded ? 'Скрыть список' : `Показать ${missingCount} ${networkWord(missingCount)}`}
          </span>
          <ChevronDown
            className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      {expanded && (
        <div id={detailsId} className="border-t border-amber-200 px-4 py-4">
          <p className="mb-3 text-sm font-medium">
            За {reportingMonth} пока нет исходных отчётов от этих сетей:
          </p>
          <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {data.missingNetworks.map((network) => (
              <li key={network} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
                <span>{network}</span>
              </li>
            ))}
          </ul>

          {data.sourceIssues && data.sourceIssues.length > 0 && (
            <div className="mt-4 border-t border-amber-200 pt-3">
              {data.sourceIssues.map((issue) => (
                <p key={`${issue.network}-${issue.period}`} className="flex items-start gap-2 text-sm text-amber-900">
                  <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-semibold">{issue.network}:</span> {issue.message}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
