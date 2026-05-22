import { AlertCircle, AlertTriangle } from "lucide-react";

const alerts = [
  {
    id: 1,
    type: "error",
    title: "PO-2024-089 Delayed",
    description: "Supplier 'TechCorp' reported 5 day shipping delay.",
    icon: AlertCircle,
  },
  {
    id: 2,
    type: "warning",
    title: "Discrepancy in WH-East",
    description: "Audit count doesn't match system for SKU LGT-01.",
    icon: AlertTriangle,
  }
];

export function NeedsAttention() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 p-5 md:px-6 md:py-5">
        <h3 className="font-semibold text-slate-900">Needs Attention</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600">
          3
        </span>
      </div>
      
      <div className="p-4 md:p-6 space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex gap-4">
            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              alert.type === 'error' ? 'text-red-500' : 'text-amber-500'
            }`}>
              <alert.icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
              <p className="text-xs text-slate-500 leading-snug">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
