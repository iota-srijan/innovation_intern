import { useState } from "react";
import { Plus, Search, Building2, Mail, Phone, MapPin, MoreVertical, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const initialSuppliers = [
  {
    id: "SUP-001",
    name: "Robocraze",
    contact: { name: "Support Team", email: "support@robocraze.com", phone: "+91 80-4653-2000" },
    location: "Bengaluru, Karnataka",
    status: "Active",
    fulfillmentScore: 96,
    leadTime: "3-5 days",
    lastOrder: "May 20, 2026",
  },
  {
    id: "SUP-002",
    name: "ThinkRobotics",
    contact: { name: "Sales Team", email: "sales@thinkrobotics.in", phone: "+91 40-2345-6789" },
    location: "Hyderabad, Telangana",
    status: "Active",
    fulfillmentScore: 88,
    leadTime: "4-6 days",
    lastOrder: "May 15, 2026",
  },
  {
    id: "SUP-003",
    name: "eSUN India",
    contact: { name: "India Office", email: "india@esun3d.com", phone: "+91 22-4567-8901" },
    location: "Mumbai, Maharashtra",
    status: "Active",
    fulfillmentScore: 92,
    leadTime: "5-7 days",
    lastOrder: "May 10, 2026",
  },
  {
    id: "SUP-004",
    name: "Evelta Electronics",
    contact: { name: "Info Desk", email: "info@evelta.com", phone: "+91 22-2345-6789" },
    location: "Mumbai, Maharashtra",
    status: "Warning",
    fulfillmentScore: 79,
    leadTime: "6-8 days",
    lastOrder: "Apr 28, 2026",
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-green-500/15 text-green-400 border-green-500/20",
    Warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${map[status] ?? map.Inactive}`}>
      {status}
    </span>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("All");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSup, setNewSup] = useState({ name: "", contactName: "", email: "", phone: "", location: "", leadTime: "", status: "Active" });
  const { userRole, isRoleLoading } = useAuth();

  if (isRoleLoading) return null;
  if (userRole === "faculty") {
    return <Navigate to="/faculty-dashboard" replace />;
  }

  const filtered = suppliers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterTab === "All" || s.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `SUP-00${suppliers.length + 1}`,
      name: newSup.name,
      contact: { name: newSup.contactName, email: newSup.email, phone: newSup.phone },
      location: newSup.location,
      status: newSup.status,
      fulfillmentScore: 100,
      leadTime: newSup.leadTime,
      lastOrder: "Just now",
    };
    setSuppliers([newEntry, ...suppliers]);
    setIsAddModalOpen(false);
    toast.success("Supplier added");
    setNewSup({ name: "", contactName: "", email: "", phone: "", location: "", leadTime: "", status: "Active" });
  };

  return (
    <AppShell title="Suppliers">
      <div className="p-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Manage Suppliers</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Manage vendor relationships and track fulfillment metrics.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Supplier
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {["All", "Active", "Warning", "Inactive"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                filterTab === tab
                  ? "bg-orange-500 text-white font-medium"
                  : "border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:border-orange-300 dark:hover:border-orange-400 font-medium"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white dark:border-white/8 dark:bg-[#1f1509]">
          <div className="border-b border-zinc-100 p-4 dark:border-white/8">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers by name or ID..."
                className="h-8 w-full rounded-lg border border-orange-100 bg-white pl-9 pr-4 text-xs text-zinc-700 outline-none focus:border-orange-500 dark:border-white/8 dark:bg-white/6 dark:text-zinc-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-100 dark:border-white/8 bg-orange-50 dark:bg-[#1f1509]">
                <tr>
                  {["Supplier", "Contact Info", "Location", "Score", "Lead Time", "Last Order", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/6">
                {filtered.map((supplier) => {
                  const scoreColor = supplier.fulfillmentScore >= 90 ? "text-green-500" : supplier.fulfillmentScore >= 70 ? "text-amber-500" : "text-red-500";
                  const scoreBg = supplier.fulfillmentScore >= 90 ? "bg-green-500" : supplier.fulfillmentScore >= 70 ? "bg-amber-500" : "bg-red-500";
                  
                  return (
                    <tr 
                      key={supplier.id} 
                      onClick={() => setSelectedSupplier(supplier)}
                      className="group transition-colors hover:bg-orange-50 dark:hover:bg-white/4 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 text-orange-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{supplier.name}</div>
                            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{supplier.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[10px]">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{supplier.contact.name}</span>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Mail className="h-2.5 w-2.5" /> {supplier.contact.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Phone className="h-2.5 w-2.5" /> {supplier.contact.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {supplier.location}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {supplier.fulfillmentScore > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${scoreColor}`}>{supplier.fulfillmentScore}%</span>
                            <div className="h-1.5 w-12 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                              <div className={`h-full rounded-full ${scoreBg}`} style={{ width: `${supplier.fulfillmentScore}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {supplier.leadTime}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {supplier.lastOrder}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={supplier.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-zinc-400 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Supplier Detail Drawer */}
      {selectedSupplier && (
        <>
          <div className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]" onClick={() => setSelectedSupplier(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-orange-950/30 z-40 p-6 shadow-2xl transform translate-x-0 transition-transform flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{selectedSupplier.name}</h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">{selectedSupplier.id}</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-orange-950/30 mb-6">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">Score</p>
                <p className={`text-2xl font-bold ${selectedSupplier.fulfillmentScore >= 90 ? 'text-green-500' : selectedSupplier.fulfillmentScore >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                  {selectedSupplier.fulfillmentScore}%
                </p>
              </div>
              <StatusBadge status={selectedSupplier.status} />
            </div>

            <div className="space-y-4 text-sm mb-8">
              <div className="flex justify-between border-b border-slate-100 dark:border-orange-950/30 pb-2">
                <span className="text-zinc-500 flex items-center gap-2"><MapPin className="w-4 h-4"/> Location</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{selectedSupplier.location}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-orange-950/30 pb-2">
                <span className="text-zinc-500">Lead Time</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{selectedSupplier.leadTime}</span>
              </div>
              <div className="flex flex-col border-b border-slate-100 dark:border-orange-950/30 pb-3 gap-2">
                <span className="text-zinc-500">Contact Details</span>
                <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-slate-100 dark:border-orange-950/30">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{selectedSupplier.contact.name}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 mb-1"><Mail className="w-3 h-3"/> {selectedSupplier.contact.email}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2"><Phone className="w-3 h-3"/> {selectedSupplier.contact.phone}</p>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">Recent PO History</h4>
              <div className="space-y-3">
                {[
                  { id: "PO-092", date: "May 18, 2026", amt: "₹42k", status: "Processing" },
                  { id: "PO-089", date: "May 12, 2026", amt: "₹24.5k", status: "Delayed" },
                  { id: "PO-074", date: "Apr 02, 2026", amt: "₹18k", status: "Completed" },
                ].map((po, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-orange-950/30">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">{po.id}</p>
                      <p className="text-[10px] text-zinc-500">{po.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500 dark:text-orange-300 mb-1">{po.amt}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${po.status === 'Completed' ? 'bg-green-500/20 text-green-500' : po.status === 'Delayed' ? 'bg-red-500/20 text-red-500' : 'bg-orange-400/20 text-orange-400'}`}>{po.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 dark:border-white/8 dark:bg-[#1f1509]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add New Supplier</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Supplier Name</label>
                <input required type="text" value={newSup.name} onChange={e => setNewSup({...newSup, name: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Contact Name</label>
                  <input required type="text" value={newSup.contactName} onChange={e => setNewSup({...newSup, contactName: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
                  <input required type="text" value={newSup.phone} onChange={e => setNewSup({...newSup, phone: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input required type="email" value={newSup.email} onChange={e => setNewSup({...newSup, email: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
                  <input required type="text" value={newSup.location} onChange={e => setNewSup({...newSup, location: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Lead Time</label>
                  <input required type="text" placeholder="e.g. 3-5 days" value={newSup.leadTime} onChange={e => setNewSup({...newSup, leadTime: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                <select value={newSup.status} onChange={e => setNewSup({...newSup, status: e.target.value})} className="w-full rounded-lg border border-orange-100 bg-transparent px-3 py-2 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:text-white">
                  <option value="Active">Active</option>
                  <option value="Warning">Warning</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-orange-100 dark:border-orange-950/30">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Add Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
