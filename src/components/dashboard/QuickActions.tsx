import { ScanBarcode, FilePlus2, ArrowLeftRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function QuickActions() {
  const handleAction = (label: string) => {
    toast.success(`${label} initiated successfully.`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 p-5 md:px-6 md:py-5">
        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
      </div>
      
      <div className="p-4 md:p-6 h-full flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleAction("Item Scan")}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            <ScanBarcode className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-slate-600">Scan Item</span>
          </button>
          
          <Link 
            to="/purchase-orders"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            <FilePlus2 className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-slate-600">Create PO</span>
          </Link>

          <button 
            onClick={() => handleAction("Inventory Transfer")}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            <ArrowLeftRight className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-slate-600">Transfer</span>
          </button>

          <button 
            onClick={() => handleAction("Audit Process")}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            <ClipboardCheck className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-slate-600">Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
