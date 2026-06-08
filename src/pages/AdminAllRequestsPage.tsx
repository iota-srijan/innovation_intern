import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action'
type PhysicalStatus = 'pending_handover' | 'issued' | 'returned' | 'consumed'
type IssueStatus = 'pending' | 'approved' | 'rejected'
type AllRequestsFilter = 'All' | 'Pending' | 'Approved' | 'Rejected'

interface IssueRequest {
  id: string
  item_id: string
  item_name: string
  quantity_requested: number
  purpose: string
  status: IssueStatus
  student_email: string
  student_name: string
  created_at: string
  return_deadline?: string | null
  review_note?: string | null
  reviewed_by?: string | null
  physical_status?: PhysicalStatus | null
  issued_at?: string | null
  returned_at?: string | null
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  if (status === 'pending')
    return <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Pending</span>
  if (status === 'approved')
    return <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Approved</span>
  return <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">Rejected</span>
}

function PhysStatusBadge({ req }: { req: IssueRequest }) {
  if (req.status !== 'approved') return <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
  const ps: PhysicalStatus = req.physical_status ?? 'pending_handover'
  if (ps === 'pending_handover')
    return <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-[#9a9aa6]">Awaiting Handover</span>
  if (ps === 'issued')
    return <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">Issued</span>
  if (ps === 'returned')
    return <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Returned</span>
  return <span className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-300">Consumed</span>
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminAllRequestsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [allFilter, setAllFilter]     = useState<AllRequestsFilter>('All')
  const [rowActionId, setRowActionId] = useState<string | null>(null)

  // ── Fetch all requests via React Query ────────────────────────────────────────

  const { data, isLoading: allLoading } = useQuery({
    queryKey: ['issue_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as IssueRequest[]
    },
    refetchOnWindowFocus: true,
  })
  const allRequests = data ?? []

  // ── Audit log helper ──────────────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string, actionType: ActionType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const actorEmail = user?.email ?? session?.user?.email ?? null
      await supabase
        .from('audit_log')
        .insert({ actor_email: actorEmail, action, action_type: actionType })
    } catch {
      // audit failures are non-fatal
    }
  }, [user?.email])

  // ── Mark Issued ───────────────────────────────────────────────────────────────

  const handleMarkIssued = async (req: IssueRequest) => {
    if (rowActionId) return
    setRowActionId(req.id)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({ physical_status: 'issued', issued_at: new Date().toISOString() })
        .eq('id', req.id)
      if (error) throw error
      await logAudit(
        `Marked ${req.item_name} as issued to ${req.student_email}`,
        'admin_action',
      )
      toast.success('Marked as issued')
      await queryClient.invalidateQueries({ queryKey: ['issue_requests'] })
    } catch {
      toast.error('Failed to mark as issued')
    } finally {
      setRowActionId(null)
    }
  }

  // ── Mark Returned ─────────────────────────────────────────────────────────────

  const handleMarkReturned = async (req: IssueRequest) => {
    if (rowActionId) return
    setRowActionId(req.id)
    try {
      const { error: reqErr } = await supabase
        .from('issue_requests')
        .update({ physical_status: 'returned', returned_at: new Date().toISOString() })
        .eq('id', req.id)
      if (reqErr) throw reqErr

      // Restore inventory
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('quantity, reorder_threshold')
        .eq('id', req.item_id)
        .single()
      if (invItem) {
        const newQty = (invItem.quantity ?? 0) + req.quantity_requested
        const newStatus =
          newQty <= 0 ? 'out_of_stock'
          : newQty <= (invItem.reorder_threshold ?? 0) ? 'low_stock'
          : 'in_stock'
        await supabase
          .from('inventory_items')
          .update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', req.item_id)
      }

      await logAudit(
        `Marked ${req.item_name} as returned by ${req.student_email}`,
        'admin_action',
      )
      toast.success('Item returned, inventory updated')
      await queryClient.invalidateQueries({ queryKey: ['issue_requests'] })
    } catch {
      toast.error('Failed to mark as returned')
    } finally {
      setRowActionId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="All Requests">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.12] px-3 py-1.5 text-xs font-semibold text-orange-300">
              <ClipboardList className="h-3.5 w-3.5" />
              Admin — Request Management
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">All Requests</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              View and manage all issue requests across all statuses
            </p>
          </div>
          <button
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['issue_requests'] })}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]"
          >
            Refresh
          </button>
        </div>

        {/* ── All Requests ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Requests</h2>
            <div className="flex items-center gap-1.5">
              {(['All', 'Pending', 'Approved', 'Rejected'] as AllRequestsFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setAllFilter(f)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                    allFilter === f
                      ? 'border-transparent bg-[#f97316] text-white shadow-[0_6px_16px_-8px_rgba(124,58,237,0.8)]'
                      : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {allLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : allRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No requests found.</p>
          ) : (() => {
            const filtered = allRequests.filter(r => {
              if (allFilter === 'All') return true
              return r.status === allFilter.toLowerCase()
            })
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                      {['Student', 'Item', 'Qty', 'Status', 'Submitted', 'Return By', 'Physical Status', 'Action'].map(h => (
                        <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} className="py-8 text-center text-gray-500 dark:text-[#6e6e78]">No {allFilter.toLowerCase()} requests.</td></tr>
                    ) : filtered.map(req => {
                      const ps: PhysicalStatus = req.physical_status ?? 'pending_handover'
                      const isLoading = rowActionId === req.id
                      return (
                        <tr key={req.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-2 first:pl-0">
                            <div className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{req.student_name}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                          </td>
                          <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                          <td className="py-3 px-2"><IssueStatusBadge status={req.status} /></td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">
                            {req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-2"><PhysStatusBadge req={req} /></td>
                          <td className="py-3 px-2">
                            {req.status === 'approved' && ps === 'pending_handover' ? (
                              <button
                                onClick={() => handleMarkIssued(req)}
                                disabled={isLoading}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/30 bg-orange-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50"
                              >
                                {isLoading && <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />}
                                Mark Issued
                              </button>
                            ) : req.status === 'approved' && ps === 'issued' ? (
                              <button
                                onClick={() => handleMarkReturned(req)}
                                disabled={isLoading}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-green-400/30 bg-green-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-green-400 transition hover:bg-green-400/[0.16] disabled:opacity-50"
                              >
                                {isLoading && <span className="h-3 w-3 animate-spin rounded-full border border-green-400 border-t-transparent" />}
                                Mark Returned
                              </button>
                            ) : (
                              <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>

      </div>
    </AppShell>
  )
}
