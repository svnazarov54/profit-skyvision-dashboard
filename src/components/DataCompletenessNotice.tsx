import { ChevronDown, FileSearch, FileWarning, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import type { DataCompleteness, DataCompletenessPeriod } from '../types/dataCompleteness';

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

function periodTitle(periods: DataCompletenessPeriod[]): string {
  const labels = periods.map((period) => monthLabel(period.reportingMonth));
  const years = periods.map((period) => period.reportingMonth.split('-')[0]);
  if (periods.length === 2 && years[0] === years[1]) {
    const first = labels[0].split(' ')[0];
    const second = labels[1].split(' ')[0];
    return `${first.charAt(0).toUpperCase() + first.slice(1)} и ${second} ${years[0]}`;
  }
  return labels
    .map((label) => label.charAt(0).toUpperCase() + label.slice(1))
    .join(', ');
}

interface DataCompletenessNoticeProps {
  data: DataCompleteness | null;
}

export function DataCompletenessNotice({ data }: DataCompletenessNoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  if (!data || data.status !== 'preliminary') {
    return null;
  }

  const periods = (data.periods?.length ? data.periods : [data]).filter(
    (period) =>
      period.missingNetworks.length > 0 ||
      Boolean(period.sourceIssues?.length) ||
      Boolean(period.reviewNotes?.length),
  );
  if (periods.length === 0) return null;

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-amber-950 shadow-sm"
      aria-live="polite"
    >
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
            {periodTitle(periods)} — данные требуют уточнения
          </span>
          <span className="mt-0.5 block text-sm text-amber-900/80">
            {periods.map((period, index) => (
              <span key={period.reportingMonth}>
                {index > 0 && ' '}
                {monthLabel(period.reportingMonth).split(' ')[0].replace(/^./, (char) => char.toUpperCase())}:{' '}
                {period.reportedNetworkCount} из {period.comparisonNetworkCount} сетей.
              </span>
            ))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm font-semibold text-amber-800">
          <span className="hidden sm:inline">
            {expanded ? 'Скрыть подробности' : 'Показать подробности'}
          </span>
          <ChevronDown
            className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      {expanded && (
        <div id={detailsId} className="border-t border-amber-200 px-4 py-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {periods.map((period) => (
              <div key={period.reportingMonth}>
                <h3 className="text-sm font-semibold">
                  {monthLabel(period.reportingMonth).replace(/^./, (char) => char.toUpperCase())}
                </h3>
                <p className="mt-1 text-sm text-amber-900/80">
                  Исходники есть по {period.reportedNetworkCount} из{' '}
                  {period.comparisonNetworkCount} сетей предыдущего месяца.
                </p>

                {period.missingNetworks.length > 0 && (
                  <>
                    <p className="mb-2 mt-3 text-sm font-medium">Нет отчёта:</p>
                    <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      {period.missingNetworks.map((network) => (
                        <li key={network} className="flex items-start gap-2">
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"
                            aria-hidden
                          />
                          <span>{network}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {period.sourceIssues?.map((issue) => (
                  <p
                    key={`${issue.network}-${issue.period}`}
                    className="mt-3 flex items-start gap-2 text-sm text-amber-900"
                  >
                    <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">{issue.network}:</span> {issue.message}
                    </span>
                  </p>
                ))}

                {period.reviewNotes && period.reviewNotes.length > 0 && (
                  <div className="mt-4 border-t border-amber-200 pt-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <FileSearch className="h-4 w-4 shrink-0" aria-hidden />
                      Нужно проверить полноту SKU
                    </p>
                    <ul className="space-y-2 text-sm text-amber-900">
                      {period.reviewNotes.map((note) => (
                        <li key={note.network}>
                          <span className="font-semibold">{note.network}:</span> {note.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
