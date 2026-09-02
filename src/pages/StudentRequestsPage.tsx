import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ShoppingCart, Wrench } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { RequestTypeTabs, type RequestTypeTab } from '../components/admin/RequestTypeTabs';
import { ReturnDeadlineBadge } from '../components/requests/ReturnDeadlineBadge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { IssueRequest, ServiceRequest } from '../types';

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">
        Pending
      </span>
    );
  if (status === 'approved')
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400">
        Approved
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">
        Rejected
      </span>
    );
  return null;
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function TaggedBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
      Tagged
    </span>
  );
}

export default function StudentRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RequestTypeTab>('equipment');
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceLoading, setServiceLoading] = useState(true);

  const studentEmail = user?.email ?? '';
  const studentEmailLower = studentEmail.trim().toLowerCase();

  // Fetch + realtime — matches own requests OR requests where this email is
  // tagged as a team member (mirrors the RLS select policy on issue_requests).
  const { data: requests = [], isLoading: loading } = useQuery<IssueRequest[]>({
    queryKey: ['issue_requests', 'mine', studentEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_requests')
        .select('*')
        .or(`student_email.eq.${studentEmail},team_members.cs.${JSON.stringify([{ email: studentEmailLower }])}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IssueRequest[];
    },
    enabled: !!studentEmail,
  });

  useEffect(() => {
    if (!studentEmail) return;

    // ── Real-time subscription ──────────────────────────────────────
    // Unfiltered: postgres_changes filters can't express the OR-across-columns
    // match above, so we just listen for any change on the table and let the
    // query itself decide what belongs to this user. Request volume is low
    // enough that this is cheap.
    const channel = supabase
      .channel(`student-requests-${studentEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issue_requests' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['issue_requests', 'mine', studentEmail] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentEmail, queryClient]);

  // Service requests fetch + real-time subscription
  useEffect(() => {
    if (!studentEmail) return;

    async function fetchServiceRequests() {
      setServiceLoading(true);
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .or(`student_email.eq.${studentEmail},team_members.cs.${JSON.stringify([{ email: studentEmailLower }])}`)
        .order('created_at', { ascending: false });

      if (!error && data) setServiceRequests(data as ServiceRequest[]);
      setServiceLoading(false);
    }

    void fetchServiceRequests();

    const channel = supabase
      .channel(`student-service-requests-${studentEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          void fetchServiceRequests();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentEmail]);

  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;
  const overdue = requests.filter((r) => {
    if (r.status !== 'approved' || r.physical_status !== 'issued' || !r.return_deadline) return false;
    return new Date(r.return_deadline) < new Date(new Date().toDateString());
  }).length;

  return (
    <AppShell title="My Requests">
      <div className="flex flex-col gap-5 p-5">

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
              Track the status of all your IdeaLab component requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-orange-400/50 transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Go to Cart
            </Link>
            <Link
              to="/student-dashboard"
              className="rounded-xl bg-orange-500 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              Browse Inventory
            </Link>
          </div>
        </div>

        <RequestTypeTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === 'equipment' && (
          <>
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
                {overdue > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {overdue} overdue
                  </span>
                )}
              </div>
            )}

            {/* Requests table */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1f1509] p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/60 border border-white/8">
                    <ClipboardList className="h-6 w-6 text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-400">No requests yet.</p>
                  <Link
                    to="/student-dashboard"
                    className="text-xs text-orange-300 hover:text-orange-200 transition-colors"
                  >
                    Browse inventory and add items to your cart →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['ITEM NAME', 'QTY', 'PURPOSE', 'STATUS', 'MENTOR', 'RETURN BY', 'SUBMITTED'].map((h) => (
                          <th
                            key={h}
                            className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr
                          key={req.id}
                          className="border-b border-white/6 hover:bg-white/4 last:border-0 transition-colors"
                        >
                          <td className="py-3 px-2 first:pl-0 font-medium text-gray-900 dark:text-zinc-200">
                            {req.item_name}
                            {req.student_email?.trim().toLowerCase() !== studentEmailLower && <TaggedBadge />}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.quantity_requested}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                            <span className="line-clamp-2" title={req.purpose}>
                              {req.purpose}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.assigned_mentor_email ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            <ReturnDeadlineBadge status={req.status} physicalStatus={req.physical_status} returnDeadline={req.return_deadline} />
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-500">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'service' && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1f1509] p-5">
            {serviceLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : serviceRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/60 border border-white/8">
                  <Wrench className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">No service requests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['MACHINE', 'DIMENSIONS', 'MATERIAL', 'INFILL', 'COPIES', 'PURPOSE', 'STATUS', 'MENTOR', 'ASSIGNED SLOT', 'NOTE'].map((h) => (
                        <th
                          key={h}
                          className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRequests.map((req) => {
                      const dims = req.dim_l != null && req.dim_w != null && req.dim_h != null
                        ? `${req.dim_l}×${req.dim_w}×${req.dim_h} mm`
                        : '—';
                      return (
                        <tr
                          key={req.id}
                          className="border-b border-white/6 hover:bg-white/4 last:border-0 transition-colors"
                        >
                          <td className="py-3 px-2 first:pl-0 font-medium text-gray-900 dark:text-zinc-200">
                            {req.machine_name}
                            {req.student_email?.trim().toLowerCase() !== studentEmailLower && <TaggedBadge />}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                            {dims}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.material_type ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.infill_percent != null ? `${req.infill_percent}%` : '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.copies}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                            <span className="line-clamp-2" title={req.purpose}>
                              {truncate(req.purpose)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400">
                            {req.assigned_mentor_email ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                            {req.status === 'approved' && req.assigned_slot
                              ? new Date(req.assigned_slot).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                              : '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                            <span className="line-clamp-2" title={req.review_note ?? undefined}>
                              {req.review_note ?? '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
