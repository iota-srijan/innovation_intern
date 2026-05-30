import React, { useState } from "react";
import { Plus, Search, FileText, ArrowUpRight, Clock, DollarSign, AlertCircle, Truck, AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";

const initialPOs = [
  {
    id: "PO-2024-089",
    supplier: "Robocraze",
    date: "May 12, 2026",
    amount: 24500.00,
    status: "Delayed",
    eta: "May 20, 2026 (Revised)",
    items: 45,
  },
  {
    id: "PO-2024-090",
    supplier: "ThinkRobotics",
    date: "May 14, 2026",
    amount: 12850.50,
    status: "In Transit",
    eta: "May 19, 2026",
    items: 120,
  },
  {
    id: "PO-2024-091",
    supplier: "eSUN India",
    date: "May 15, 2026",
    amount: 8900.00,
    status: "Processing",
    eta: "May 22, 2026",
    items: 32,
  },
  {
    id: "PO-2024-092",
    supplier: "Evelta Electronics",
    date: "May 18, 2026",
    amount: 42000.00,
    status: "Pending Approval",
    eta: "TBD",
    items: 215,
  },
];

const mockLineItems = [
  { sku: "SKU-992", name: "MacBook Pro M3 Max", qty: 10, price: 2100 },
  { sku: "SKU-104", name: 'Dell UltraSharp 32"', qty: 4, price: 875 },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Processing: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    "In Transit": "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Delayed: "bg-red-500/15 text-red-400 border-red-500/20",
    "Pending Approval": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-zinc-500/15 text-zinc-400"}`}>
      {status}
    </span>
  );
}

export default function PurchaseOrders() {
  const [pos, setPos] = useState(initialPOs);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("All");
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPO, setNewPO] = useState({ supplier: "Robocraze", eta: "" });
  const [newPOLines, setNewPOLines] = useState([{ id: 1, sku: "", name: "", qty: 1, price: 0 }]);

  const filtered = pos.filter((po) => {
    const matchesSearch = po.id.toLowerCase().includes(search.toLowerCase()) || po.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterTab === "All" || po.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = newPOLines.reduce((acc, line) => acc + (line.qty * line.price), 0);
    const totalItems = newPOLines.reduce((acc, line) => acc + line.qty, 0);
    const newEntry = {
      id: `PO-2026-0${93 + pos.length}`,
      supplier: newPO.supplier,
      date: "Just now",
      amount: totalAmount,
      status: "Pending Approval",
      eta: newPO.eta || "TBD",
      items: totalItems,
    };
    setPos([newEntry, ...pos]);
    setIsModalOpen(false);
    toast.success("Purchase order created");
    setNewPOLines([{ id: Date.now(), sku: "", name: "", qty: 1, price: 0 }]);
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <AppShell title="Purchase Orders">
      <div className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Purchase Orders</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Track inbound inventory and manage supplier orders.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600 shadow-lg shadow-violet-700/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Create PO
          </button>
        </div>

        {/* Summary Strip */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500"><DollarSign className="w-4 h-4"/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Total PO Value</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">₹88,250</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><AlertCircle className="w-4 h-4"/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Delayed</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">1</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Truck className="w-4 h-4"/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">In Transit</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">1</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Clock className="w-4 h-4"/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Pending Approval</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">1</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {["All", "Delayed", "In Transit", "Processing", "Pending Approval"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                filterTab === tab
                  ? "bg-violet-600 text-white font-medium"
                  : "border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:border-violet-400 dark:hover:border-violet-500 font-medium"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
          <div className="border-b border-zinc-100 p-4 dark:border-white/8">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PO number or supplier..."
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-xs text-zinc-700 outline-none focus:border-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-100 dark:border-white/8 bg-zinc-50 dark:bg-[#1a1a1a]">
                <tr>
                  {["PO Number", "Supplier", "Amount", "Status", "Expected Delivery", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/6">
                {filtered.map((po) => (
                  <React.Fragment key={po.id}>
                    <tr 
                      onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                      className="group transition-colors hover:bg-zinc-50 dark:hover:bg-white/4 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/8 dark:bg-white/6 dark:text-zinc-400">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{po.id}</div>
                            <div className="text-[10px] font-medium text-zinc-500 mt-0.5">{po.date}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{po.supplier}</div>
                        <div className="text-[10px] font-medium text-zinc-500 mt-0.5">{po.items} items</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-200">
                        {fmt(po.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock className={`h-3 w-3 ${po.status === "Delayed" ? "text-red-400" : "text-zinc-400"}`} />
                            <span className={po.status === "Delayed" ? "text-red-400" : "text-zinc-600 dark:text-zinc-400"}>
                              {po.eta}
                            </span>
                          </div>
                          {po.status === "Delayed" && (
                            <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1 ml-4">
                              <AlertTriangle className="w-3 h-3"/> 5 days overdue
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ArrowUpRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row Accordion */}
                    {expandedPO === po.id && (
                      <tr className="bg-slate-50/50 dark:bg-zinc-800/30">
                        <td colSpan={6} className="px-14 py-4">
                          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
                                <tr>
                                  <th className="px-4 py-2 font-semibold text-zinc-500">SKU</th>
                                  <th className="px-4 py-2 font-semibold text-zinc-500">Item Name</th>
                                  <th className="px-4 py-2 font-semibold text-zinc-500">Qty</th>
                                  <th className="px-4 py-2 font-semibold text-zinc-500">Unit Price</th>
                                  <th className="px-4 py-2 font-semibold text-zinc-500 text-right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {mockLineItems.map(li => (
                                  <tr key={li.sku}>
                                    <td className="px-4 py-2.5 font-mono text-zinc-500">{li.sku}</td>
                                    <td className="px-4 py-2.5 font-semibold text-zinc-900 dark:text-zinc-200">{li.name}</td>
                                    <td className="px-4 py-2.5 font-medium text-zinc-700 dark:text-zinc-400">{li.qty}</td>
                                    <td className="px-4 py-2.5 font-medium text-zinc-700 dark:text-zinc-400">{fmt(li.price)}</td>
                                    <td className="px-4 py-2.5 font-bold text-zinc-900 dark:text-zinc-200 text-right">{fmt(li.qty * li.price)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/8 dark:bg-[#1a1a1a] shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Create Purchase Order</h3>
                <p className="text-xs text-zinc-500 mt-1">Draft a new inbound shipment order.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">Supplier</label>
                  <select 
                    value={newPO.supplier} 
                    onChange={e => setNewPO({...newPO, supplier: e.target.value})} 
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900 outline-none focus:border-violet-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-medium"
                  >
                    <option value="Robocraze">Robocraze</option>
                    <option value="ThinkRobotics">ThinkRobotics</option>
                    <option value="eSUN India">eSUN India</option>
                    <option value="Evelta Electronics">Evelta Electronics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">Expected Delivery Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newPO.eta} 
                    onChange={e => setNewPO({...newPO, eta: e.target.value})} 
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900 outline-none focus:border-violet-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-medium" 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Line Items</label>
                  <button 
                    type="button" 
                    onClick={() => setNewPOLines([...newPOLines, { id: Date.now(), sku: "", name: "", qty: 1, price: 0 }])}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3"/> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newPOLines.map((line, idx) => (
                    <div key={line.id} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="w-1/4">
                        <input type="text" placeholder="SKU" required value={line.sku} onChange={e => {
                          const newL = [...newPOLines]; newL[idx].sku = e.target.value; setNewPOLines(newL);
                        }} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
                      </div>
                      <div className="flex-1">
                        <input type="text" placeholder="Item Name" required value={line.name} onChange={e => {
                          const newL = [...newPOLines]; newL[idx].name = e.target.value; setNewPOLines(newL);
                        }} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
                      </div>
                      <div className="w-20">
                        <input type="number" min="1" placeholder="Qty" required value={line.qty} onChange={e => {
                          const newL = [...newPOLines]; newL[idx].qty = parseInt(e.target.value)||0; setNewPOLines(newL);
                        }} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
                      </div>
                      <div className="w-28 relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                        <input type="number" min="0" step="0.01" placeholder="Price" required value={line.price} onChange={e => {
                          const newL = [...newPOLines]; newL[idx].price = parseFloat(e.target.value)||0; setNewPOLines(newL);
                        }} className="w-full rounded-lg border border-zinc-200 bg-white pl-7 pr-3 py-1.5 text-xs outline-none focus:border-violet-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
                      </div>
                      <button type="button" onClick={() => setNewPOLines(newPOLines.filter(l => l.id !== line.id))} className="text-zinc-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500">Total:</span> 
                  {fmt(newPOLines.reduce((acc, l) => acc + (l.qty * l.price), 0))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-5 py-2.5 font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2.5 font-bold text-white hover:bg-violet-700 transition-colors shadow-lg shadow-violet-600/20">Submit PO</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  );
}
