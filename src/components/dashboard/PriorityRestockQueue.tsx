import { Filter } from "lucide-react";

const restockItems = [
  {
    id: 1,
    sku: "APL-MBP-14-M3M",
    name: "MacBook Pro M3 Max",
    status: "Critical",
    stock: 12,
    capacity: 50,
    velocity: "High",
    velocityTrend: "up"
  },
  {
    id: 2,
    sku: "DEL-U3223QE",
    name: "Dell UltraSharp 32\"",
    status: "Low",
    stock: 45,
    capacity: 100,
    velocity: "Med",
    velocityTrend: "none"
  }
];

export function PriorityRestockQueue() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 p-5 md:px-6 md:py-5 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">Priority Restock Queue</h3>
        <button className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Filter className="h-3 w-3 text-slate-400" />
          All Warehouses
        </button>
      </div>
      
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">SKU / ITEM</th>
              <th className="px-6 py-4 font-medium">STATUS</th>
              <th className="px-6 py-4 font-medium">STOCK</th>
              <th className="px-6 py-4 font-medium">VELOCITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {restockItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
                    item.status === 'Critical' 
                      ? 'bg-red-50 text-red-600 border border-red-100' 
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">{item.stock}</span>
                  <span className="text-slate-400"> / {item.capacity}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    {item.velocity}
                    {item.velocityTrend === "up" && <span className="text-red-500">↑</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
