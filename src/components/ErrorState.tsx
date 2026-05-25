import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="h-8 w-8 text-[#DC2626]" />
      </div>
      <h2 className="text-xl font-semibold text-[#111827]">
        Не удалось загрузить данные
      </h2>
      <p className="max-w-lg text-center text-sm text-[#6B7280]">{message}</p>
    </div>
  );
}
