import clsx from 'clsx';
import { LayoutDashboard, Table2 } from 'lucide-react';

export type AppTab = 'dashboard' | 'spreadsheet';

interface AppTabsProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { id: 'spreadsheet', label: 'Таблица Excel', icon: Table2 },
];

export function AppTabs({ active, onChange }: AppTabsProps) {
  return (
    <nav className="mb-6 flex gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={clsx(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none',
            active === id
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}
