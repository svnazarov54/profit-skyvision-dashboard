import { Download } from 'lucide-react';

interface DashboardHeaderProps {
  onExport?: () => void;
  exportLabel?: string;
}

export function DashboardHeader({
  onExport,
  exportLabel = 'Экспорт Excel',
}: DashboardHeaderProps) {
  return (
    <header className="mb-6 space-y-3">
      <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#374151] md:px-4 md:text-sm">
        <span className="text-[#6B7280]">По вопросам: </span>
        <span className="font-medium text-[#111827]">Сергей Назаров</span>
        <span className="mx-1.5 text-[#D1D5DB]">·</span>
        <a
          href="https://t.me/snazarov54"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#2563EB] hover:underline"
        >
          Telegram @snazarov54
        </a>
        <span className="mx-1.5 text-[#D1D5DB]">·</span>
        <a href="mailto:s.nazarov@pph.group" className="font-medium text-[#2563EB] hover:underline">
          s.nazarov@pph.group
        </a>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] md:text-3xl">
            Аналитика продаж: Скайвижн (в т.ч. СТМ сетей) и Квинакс
          </h1>
          <p className="mt-1 text-sm text-[#6B7280] md:text-base">
            (на основе отчётов аптечных сетей)
          </p>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            {exportLabel}
          </button>
        )}
      </div>
    </header>
  );
}
