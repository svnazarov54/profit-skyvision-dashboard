import { Database } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'Нет данных для отображения',
  message = 'По выбранным фильтрам данных нет. Попробуйте изменить период или сбросить фильтры.',
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DBEAFE]">
        <Database className="h-8 w-8 text-[#2563EB]" />
      </div>
      <h2 className="text-xl font-semibold text-[#111827]">{title}</h2>
      <p className="max-w-lg text-center text-sm text-[#6B7280]">{message}</p>
    </div>
  );
}
