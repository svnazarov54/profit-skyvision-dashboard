import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { PointMetrics } from '../types/sales';
import { formatNumber, formatPercent } from '../utils/formatters';
import { Card, StatusBadge } from './ui';

interface PharmacyTableProps {
  data: PointMetrics[];
}

export function PharmacyTable({ data }: PharmacyTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'sales', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo<ColumnDef<PointMetrics>[]>(
    () => [
      {
        accessorKey: 'network',
        header: 'Аптечная сеть',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'city',
        header: 'Город',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'federalSubject',
        header: 'Регион',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'address',
        header: 'Адрес',
        cell: (info) => (
          <span className="block max-w-xs truncate" title={String(info.getValue())}>
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'sales',
        header: 'Продажи',
        cell: (info) => formatNumber(info.getValue() as number),
      },
      {
        id: 'change',
        header: 'Изменение',
        accessorFn: (row) => row.changePct,
        cell: ({ row }) => {
          const { changePct, changeAbs } = row.original;
          if (changePct === null) return 'Нет базы';
          return `${formatPercent(changePct)} · ${changeAbs >= 0 ? '+' : ''}${formatNumber(changeAbs)} шт.`;
        },
      },
      {
        accessorKey: 'sharePct',
        header: 'Доля',
        cell: (info) => `${(info.getValue() as number).toFixed(1)}%`,
      },
      {
        accessorKey: 'status',
        header: 'Статус',
        cell: (info) => <StatusBadge status={info.getValue() as string} />,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const r = row.original;
      return (
        r.network.toLowerCase().includes(search) ||
        r.city.toLowerCase().includes(search) ||
        r.fullCity.toLowerCase().includes(search) ||
        r.federalSubject.toLowerCase().includes(search) ||
        r.address.toLowerCase().includes(search)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <Card title="Детализация по аптечным точкам" className="overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Найти точку, город или сеть"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span>Строк на странице:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setPageSize(size);
              table.setPageSize(size);
            }}
            className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6B7280]">Нет данных</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="cursor-pointer whitespace-nowrap border-b border-[#E5E7EB] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#E5E7EB] transition hover:bg-[#F8FAFC]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 text-[#111827]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-[#6B7280]">
            <span>
              Показано {table.getRowModel().rows.length} из{' '}
              {table.getFilteredRowModel().rows.length} точек
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 disabled:opacity-40"
              >
                Назад
              </button>
              <span className="px-2 py-1">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
