export function StockChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Inventory Movement Trend</h3>
      </div>
      <div className="flex h-[280px] w-full items-center justify-center text-slate-400 text-sm">
        No movement data available.
      </div>
    </div>
  );
}
