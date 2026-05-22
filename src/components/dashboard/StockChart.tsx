import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const data = [
  { name: 'Jan', value: 120 },
  { name: 'Feb', value: 130 },
  { name: 'Mar', value: 100 },
  { name: 'Apr', value: 130 },
  { name: 'May', value: 90 },
  { name: 'Jun', value: 210 },
  { name: 'Jul', value: 160 },
];

const LOW_THRESHOLD = 100;

export function StockChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Inventory Movement Trend</h3>
        <div className="flex gap-1 rounded-md bg-slate-100 p-1">
          <button className="rounded px-2.5 py-1 text-xs font-semibold bg-white text-slate-900 border border-slate-200">30D</button>
          <button className="rounded px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">90D</button>
          <button className="rounded px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">1Y</button>
        </div>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              domain={[50, 250]}
              ticks={[100, 150, 200]}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
              cursor={{ fill: 'transparent' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value < LOW_THRESHOLD ? "#ef4444" : "#4f46e5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
