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
    <header className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-[#111827] md:text-3xl">
        Аналитика продаж аптечных сетей
      </h1>
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
    </header>
  );
}
