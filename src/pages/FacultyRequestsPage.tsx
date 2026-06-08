import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ShoppingCart, Plus, X } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../hooks/useItems';
import { supabase } from '../lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────

interface IssueRequest {
  id: string;
  item_id: string;
  item_name: string;
  quantity_requested: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  student_email: string;
  student_name: string;
  created_at: string;
  return_deadline?: string | null;
  review_note?: string | null;
  physical_status?: string | null;
}

// ── Badges ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">Pending</span>;
  if (status === 'approved')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400">Approved</span>;
  if (status === 'rejected')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">Rejected</span>;
  return null;
}

// ── Main Component ────────────────────────────────────────────────

export default function FacultyRequestsPage() {
  const { user } = useAuth();
  const { data: items = [] } = useItems();

  const facultyEmail = user?.email ?? '';
  const facultyName  = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Faculty';

  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // ── New Request form state ────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [reqItem, setReqItem]           = useState('');
  const [reqQty, setReqQty]             = useState<number | ''>(1);
  const [reqPurpose, setReqPurpose]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitCooldown, setSubmitCooldown] = useState(false);

  // ── Fetch & realtime ─────────────────────────────────────────────
  const { data: requests = [], isLoading: loading } = useQuery<IssueRequest[]>({
    queryKey: ["issue_requests", "faculty-mine", facultyEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_requests')
        .select('*')
        .eq('student_email', facultyEmail)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IssueRequest[];
    },
    enabled: !!facultyEmail,
  });

  useEffect(() => {
    if (!facultyEmail) return;

    const channel = supabase
      .channel(`faculty-requests-page-${facultyEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issue_requests', filter: `student_email=eq.${facultyEmail}` },
        () => { void queryClient.invalidateQueries({ queryKey: ["issue_requests", "faculty-mine", facultyEmail] }); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [facultyEmail, queryClient]);

  // ── Stats ────────────────────────────────────────────────────────
  const pending  = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  // ── Submit new request ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!reqItem || !reqPurpose.trim() || !facultyEmail || submitting || submitCooldown) return;
    const qty = Math.min(Math.max(1, Number(reqQty) || 1), 100);
    setSubmitting(true);
    try {
      const extendedItems = items as any[];
      const selectedItem = extendedItems.find((i: any) => i.id === reqItem);
      if (!selectedItem) throw new Error('Item not found');

      const { error } = await supabase.from('issue_requests').insert({
        student_id: user?.id,
        student_email: facultyEmail,
        student_name: facultyName,
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        quantity_requested: qty,
        purpose: reqPurpose.trim().slice(0, 500),
        status: 'pending',
      });
      if (error) throw error;

      toast.success(`Request for "${selectedItem.name}" submitted!`);
      setReqItem('');
      setReqQty(1);
      setReqPurpose('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["issue_requests", "faculty-mine", facultyEmail] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
      setSubmitCooldown(true);
      setTimeout(() => setSubmitCooldown(false), 3000);
    }
  };

  // ── Filtered requests ─────────────────────────────────────────────
  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'All') return true;
    return r.status === statusFilter.toLowerCase();
  });

  const extendedItems = items as any[];

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AppShell title="My Requests">
      <div className="flex flex-col gap-5 p-5 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-orange-300" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Requests</h2>
              {requests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-400/20 text-orange-300">
                  {requests.length}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Track all your IdeaLab item requests and submit new ones.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/cart"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:border-orange-400/50 transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Go to Cart
            </Link>
            <Link
              to="/faculty-dashboard"
              className="rounded-xl bg-orange-500 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              Browse Inventory
            </Link>
          </div>
        </div>

        {/* Mini stat pills */}
        {requests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {pending} pending
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-medium text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {approved} approved
            </span>
          </div>
        )}

        {/* ── New Request panel ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111827]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/[0.06]">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">New Request</span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400/40 bg-orange-400/10 px-3 py-1.5 text-[11px] font-semibold text-orange-300 hover:bg-orange-400/20 transition-colors cursor-pointer"
            >
              {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showForm ? 'Cancel' : 'Submit a Request'}
            </button>
          </div>

          {showForm && (
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Item selector */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    Item <span className="text-orange-300">*</span>
                  </label>
                  <select
                    value={reqItem}
                    onChange={(e) => setReqItem(e.target.value)}
                    className="w-full rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 px-3 py-2.5 text-[12px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">Select item…</option>
                    {extendedItems
                      .filter((i: any) => i.quantity > 0)
                      .map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.quantity} avail.)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    Quantity <span className="text-orange-300">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={reqItem ? (extendedItems.find((i: any) => i.id === reqItem)?.quantity ?? 999) : 999}
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 px-3 py-2.5 text-[12px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    Purpose <span className="text-orange-300">*</span>
                  </label>
                  <input
                    type="text"
                    value={reqPurpose}
                    maxLength={500}
                    onChange={(e) => setReqPurpose(e.target.value)}
                    placeholder="Describe usage or project…"
                    className="w-full rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 px-3 py-2.5 text-[12px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 outline-none transition focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!reqItem || !reqPurpose.trim() || submitting || submitCooldown}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {submitting && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {submitting ? 'Submitting…' : submitCooldown ? 'Submitted' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Pending Requests ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="flex items-center gap-3 mb-4 p-5 pb-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pending Requests</h2>
            {pending > 0 && (
              <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-300">
                {pending}
              </span>
            )}
          </div>

          {pending === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
              No pending requests — all caught up!
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/8 bg-blue-50 dark:bg-zinc-800">
                    {["ITEM", "QTY", "PURPOSE", "SUBMITTED", "STATUS"].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.filter(r => r.status === 'pending').map((req) => (
                    <tr key={req.id} className="border-b border-gray-100 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/4 last:border-0 transition-colors">
                      <td className="py-3 px-2 first:pl-5 font-medium text-gray-900 dark:text-white">
                        {req.item_name}
                      </td>
                      <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                        {req.quantity_requested}
                      </td>
                      <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                        <span className="line-clamp-2" title={req.purpose}>{req.purpose || "—"}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-zinc-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 pr-5">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Requests table ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111827] overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3 p-5 pb-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Request History</span>
            <div className="flex items-center gap-1">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    statusFilter === f
                      ? 'bg-orange-500 text-white'
                      : 'text-zinc-500 hover:text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/60 border border-white/8">
                <ClipboardList className="h-6 w-6 text-zinc-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {requests.length === 0 ? 'No requests yet.' : 'No requests match this filter.'}
              </p>
              {requests.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs text-orange-300 hover:text-orange-200 transition-colors cursor-pointer"
                >
                  Submit your first request →
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/8 bg-blue-50 dark:bg-zinc-800">
                    {['ITEM NAME', 'QTY', 'PURPOSE', 'STATUS', 'RETURN BY', 'SUBMITTED'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-gray-100 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/4 last:border-0 transition-colors"
                    >
                      <td className="py-3 px-2 first:pl-5 font-medium text-gray-900 dark:text-white">{req.item_name}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">{req.quantity_requested}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                        <span className="line-clamp-2" title={req.purpose}>{req.purpose}</span>
                      </td>
                      <td className="py-3 px-2"><StatusBadge status={req.status} /></td>
                      <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                        {req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-2 pr-5 text-gray-600 dark:text-zinc-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
