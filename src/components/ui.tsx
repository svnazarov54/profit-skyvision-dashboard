import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-[#6B7280]">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

interface DropdownFilterProps {
  label: string;
  summary: string;
  children: ReactNode;
  className?: string;
}

export function DropdownFilter({
  label,
  summary,
  children,
  className,
}: DropdownFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={clsx('relative min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm transition hover:border-[#2563EB]"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#374151]">{label}</span>
          <span className="block truncate text-sm text-[#111827]">{summary}</span>
        </span>
        <ChevronDown
          className={clsx('h-4 w-4 shrink-0 text-[#6B7280] transition', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function SelectedChips({
  selected,
  onRemove,
  getLabel = (value) => value,
}: {
  selected: string[];
  onRemove: (value: string) => void;
  getLabel?: (value: string) => string;
}) {
  if (!selected.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {selected.map((value) => (
        <span
          key={value}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#2563EB] bg-[#DBEAFE] px-2 py-0.5 text-xs text-[#2563EB]"
        >
          <span className="truncate">{getLabel(value)}</span>
          <button
            type="button"
            onClick={() => onRemove(value)}
            className="shrink-0 hover:text-[#DC2626]"
            aria-label="Удалить"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

function FilterBulkActions({
  onSelectAll,
  onClearAll,
}: {
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="mb-2 flex gap-2">
      <button
        type="button"
        onClick={onSelectAll}
        className="text-xs font-medium text-[#2563EB] hover:underline"
      >
        Выбрать всё
      </button>
      <span className="text-[#E5E7EB]">|</span>
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-[#6B7280] hover:underline"
      >
        Сбросить всё
      </button>
    </div>
  );
}

interface SearchableCheckboxListProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function SearchableCheckboxList({
  options,
  selected,
  onChange,
  placeholder = 'Поиск...',
}: SearchableCheckboxListProps) {
  const [query, setQuery] = useState('');

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? options.filter((o) => o.toLowerCase().includes(q))
      : options;
    return filtered;
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <>
      <FilterBulkActions
        onSelectAll={() => onChange([...options])}
        onClearAll={() => onChange([])}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`${placeholder} (${options.length})`}
        className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
      />
      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#E5E7EB]">
        {visibleOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[#6B7280]">Ничего не найдено</p>
        ) : (
          visibleOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-2 border-b border-[#F3F4F6] px-3 py-2 text-sm last:border-b-0 hover:bg-[#F8FAFC]"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="mt-0.5 shrink-0"
              />
              <span className="whitespace-normal break-words text-[#111827]">{option}</span>
            </label>
          ))
        )}
      </div>
      <SelectedChips selected={selected} onRemove={toggle} />
    </>
  );
}

interface PointCheckboxListProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function PointCheckboxList({ options, selected, onChange }: PointCheckboxListProps) {
  const [query, setQuery] = useState('');

  const labelById = useMemo(
    () => new Map(options.map((o) => [o.id, o.label])),
    [options],
  );

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return filtered;
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <>
      <FilterBulkActions
        onSelectAll={() => onChange(options.map((o) => o.id))}
        onClearAll={() => onChange([])}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Поиск точки (${options.length})`}
        className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
      />
      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#E5E7EB]">
        {visibleOptions.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-2 border-b border-[#F3F4F6] px-3 py-2 text-sm last:border-b-0 hover:bg-[#F8FAFC]"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
              className="mt-0.5 shrink-0"
            />
            <span className="whitespace-normal break-words text-[#111827]">{option.label}</span>
          </label>
        ))}
      </div>
      <SelectedChips
        selected={selected}
        onRemove={toggle}
        getLabel={(id) => labelById.get(id) ?? id}
      />
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Рост': 'bg-green-50 text-[#16A34A] border-green-200',
    'Стабильно': 'bg-gray-50 text-[#6B7280] border-gray-200',
    'Спад': 'bg-orange-50 text-[#F97316] border-orange-200',
    'Критический спад': 'bg-red-50 text-[#DC2626] border-red-200',
    'Нет базы': 'bg-gray-50 text-[#9CA3AF] border-gray-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors[status] ?? colors['Стабильно'],
      )}
    >
      {status}
    </span>
  );
}
