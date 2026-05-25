export function LoadingState() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-96 animate-pulse rounded-lg bg-[#E5E7EB]" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-[#E5E7EB]" />
      </div>
      <p className="text-sm text-[#6B7280]">Загружаем данные продаж...</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#E5E7EB]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-[#E5E7EB] lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl bg-[#E5E7EB]" />
      </div>
    </div>
  );
}
