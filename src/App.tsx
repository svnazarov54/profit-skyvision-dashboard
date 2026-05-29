import { Lightbulb } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AppTabs, type AppTab } from './components/AppTabs';
import { DashboardHeader } from './components/DashboardHeader';
import { FiltersPanel } from './components/FiltersPanel';
import { KpiCards } from './components/KpiCards';
import { SalesTrendChart } from './components/SalesTrendChart';
import { NetworkComparisonChart } from './components/NetworkComparisonChart';
import { RegionSalesChart } from './components/RegionSalesChart';
import { SplitDynamicsChart } from './components/SplitDynamicsChart';
import { PivotTable } from './components/PivotTable';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { EmptyState } from './components/EmptyState';
import { useCsvData } from './hooks/useCsvData';
import { useFilters } from './hooks/useFilters';
import { useDashboardAnalytics } from './hooks/useDashboardAnalytics';
import type { PivotHierarchyOrder, SplitChartDimension } from './types/filters';
import { getPeriodRange } from './utils/dateUtils';
import { exportPivotToExcel } from './utils/exportExcel';
import { getOrderedPivotLevels } from './utils/pivotTable';

const SpreadsheetPivot = lazy(() =>
  import('./components/SpreadsheetPivot').then((m) => ({ default: m.SpreadsheetPivot })),
);

function readTabFromUrl(): AppTab {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab === 'spreadsheet' ? 'spreadsheet' : 'dashboard';
}

function syncTabToUrl(tab: AppTab): void {
  const params = new URLSearchParams(window.location.search);
  if (tab === 'spreadsheet') params.set('tab', 'spreadsheet');
  else params.delete('tab');

  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  const current = window.location.pathname + window.location.search;
  if (current !== next) {
    window.history.replaceState(null, '', next);
  }
}

function App() {
  const { state, records, dateBounds } = useCsvData();
  const { filters, isFilterPending, updateFilter, resetFilters, setFilters, setDateRange } =
    useFilters();
  const [activeTab, setActiveTab] = useState<AppTab>(() => readTabFromUrl());
  const [pivotOrder, setPivotOrder] = useState<PivotHierarchyOrder>('region-only');
  const [splitDimension, setSplitDimension] = useState<SplitChartDimension>('network');
  const [pivotExpanded, setPivotExpanded] = useState<Set<string>>(new Set());

  const analytics = useDashboardAnalytics(records, filters, dateBounds, pivotOrder);

  useEffect(() => {
    syncTabToUrl(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const onPopState = () => setActiveTab(readTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTabChange = (tab: AppTab) => setActiveTab(tab);

  useEffect(() => {
    if (!records.length) return;
    const { minDate, maxDate } = dateBounds;
    if (!minDate || !maxDate) return;
    if (filters.periodPreset === 'all' || (filters.dateFrom && filters.dateTo)) return;

    const range = getPeriodRange(filters.periodPreset, minDate, maxDate);
    setFilters((prev) => ({
      ...prev,
      dateFrom: range.from || null,
      dateTo: range.to || null,
    }));
  }, [
    records.length,
    dateBounds.minDate,
    dateBounds.maxDate,
    filters.periodPreset,
    filters.dateFrom,
    filters.dateTo,
    setFilters,
  ]);

  useEffect(() => {
    setPivotExpanded(new Set());
  }, [pivotOrder, filters.timeGrouping]);

  useEffect(() => {
    if (activeTab !== 'spreadsheet') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeTab]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <LoadingState />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <ErrorState message={state.errorMessage ?? 'Неизвестная ошибка'} />
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <EmptyState
          title="Нет данных для отображения"
          message="Добавьте данные в geo_by_pharmacy.csv."
        />
      </div>
    );
  }

  const showNoFilterData = !analytics.hasData;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
        <DashboardHeader
          onExport={() =>
            exportPivotToExcel(
              analytics.pivotTree,
              analytics.pivotMonths,
              getOrderedPivotLevels(pivotOrder),
              filters.timeGrouping,
            )
          }
        />

        <AppTabs active={activeTab} onChange={handleTabChange} />

        <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF] md:text-base">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" aria-hidden />
          <span>
          Внизу страницы —{' '}
          <span className="font-semibold">сводная таблица продаж</span> с детализацией по
          регионам, городам и аптекам. Прокрутите вниз, чтобы открыть её.
          </span>
        </p>

        <div
          className={`sticky top-0 z-40 -mx-4 mb-6 border-b border-[#E5E7EB]/80 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur-md transition-opacity md:-mx-6 md:px-6 ${isFilterPending ? 'opacity-90' : ''}`}
        >
          <FiltersPanel
            filters={filters}
            options={analytics.filterOptions}
            onUpdate={updateFilter}
            onDateRangeChange={setDateRange}
            onReset={resetFilters}
          />
        </div>

        {showNoFilterData ? (
          <EmptyState />
        ) : activeTab === 'spreadsheet' ? (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center text-sm text-[#6B7280]">
                Загрузка таблицы…
              </div>
            }
          >
            <SpreadsheetPivot
              records={analytics.currentRecords}
              order={pivotOrder}
              onOrderChange={setPivotOrder}
            />
          </Suspense>
        ) : (
          <>
            <KpiCards
              kpi={analytics.kpi}
              hasData={analytics.hasData}
              timeGrouping={analytics.timeGrouping}
            />

            <div className="mb-6 grid gap-4 xl:grid-cols-2">
              <SalesTrendChart
                data={analytics.monthlySales}
                timeGrouping={analytics.timeGrouping}
              />
              <SplitDynamicsChart
                dimension={splitDimension}
                onDimensionChange={setSplitDimension}
                byNetwork={analytics.splitByNetwork}
                byRegion={analytics.splitByRegion}
                timeGrouping={analytics.timeGrouping}
              />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <NetworkComparisonChart data={analytics.networkSales} />
              <RegionSalesChart data={analytics.regionSales} />
            </div>

            <PivotTable
              tree={analytics.pivotTree}
              months={analytics.pivotMonths}
              timeGrouping={analytics.timeGrouping}
              order={pivotOrder}
              onOrderChange={setPivotOrder}
              expanded={pivotExpanded}
              onExpandedChange={setPivotExpanded}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
