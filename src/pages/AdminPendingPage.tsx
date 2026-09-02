import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, X } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { RequestTypeTabs, type RequestTypeTab } from '../components/admin/RequestTypeTabs'
import { ServiceRequestsPanel } from '../components/admin/ServiceRequestsPanel'
import { TeamMembersBadgeList } from '../components/requests/TeamMembersBadgeList'
import { StlViewButton } from '../components/requests/StlViewButton'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { notifyUser } from '../lib/notify'
import { useMentors } from '../hooks/useMentors'
import type { TeamMember } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action'
type PhysicalStatus = 'pending_handover' | 'issued' | 'returned' | 'consumed'
type IssueStatus = 'pending' | 'approved' | 'rejected'

interface IssueRequest {
  id: string
  student_id?: string | null
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
  team_members?: TeamMember[]
  estimated_amount?: number | null
  estimated_amount_unit?: string | null
  stl_file_url?: string | null
  stl_file_name?: string | null
}

interface AuditExtra {
  item_id?: string
  item_name?: string
  quantity_change?: number
  previous_quantity?: number
  new_quantity?: number
}

// ─── Modal ──────────────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminPendingPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { mentors } = useMentors()

  const [activeTab, setActiveTab] = useState<RequestTypeTab>('equipment')

  // Approve modal — return deadline is set by the assigned mentor once they
  // hand the item over, not chosen here.
  const [approveTarget, setApproveTarget]     = useState<IssueRequest | null>(null)
  const [approveMentorEmail, setApproveMentorEmail] = useState('')
  const [approveNote, setApproveNote]         = useState('')
  const [approveLoading, setApproveLoading]   = useState(false)

  // Reject modal
  const [rejectTarget, setRejectTarget]       = useState<IssueRequest | null>(null)
  const [rejectNote, setRejectNote]           = useState('')
  const [rejectLoading, setRejectLoading]     = useState(false)

  // ── Fetch all requests via React Query, filter pending client-side ────────────

  const { data: allData, isLoading: pendingLoading } = useQuery({
    queryKey: ['issue_requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as IssueRequest[]
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })
  const pendingRequests = (allData ?? []).filter(r => r.status === 'pending')

  // ── Audit log helper ──────────────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string, actionType: ActionType, extra?: AuditExtra) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const actorEmail = user?.email ?? session?.user?.email ?? 'unknown-admin'
      await supabase
        .from('audit_log')
        .insert({ actor_email: actorEmail, action, action_type: actionType, ...extra })
    } catch {
      // audit failures are non-fatal
    }
  }, [user?.email])

  // ── Approve issue request ─────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!approveTarget || !approveMentorEmail || approveLoading) return
    setApproveLoading(true)
    try {
      // Fetch current inventory stock for this item
      const { data: invItem, error: fetchErr } = await supabase
        .from('inventory_items')
        .select('id, quantity, reorder_threshold')
        .eq('id', approveTarget.item_id)
        .single()

      if (fetchErr || !invItem) {
        toast.error('Could not fetch item stock. Approval cancelled.')
        return
      }

      const previousQuantity = invItem.quantity ?? 0
      const newQuantity = previousQuantity - approveTarget.quantity_requested

      if (newQuantity < 0) {
        toast.error('Insufficient stock. Cannot approve.')
        return
      }

      const newStatus =
        newQuantity <= 0 ? 'out_of_stock'
        : newQuantity <= (invItem.reorder_threshold ?? 0) ? 'low_stock'
        : 'in_stock'

      // Deduct inventory quantity
      const { error: invUpdateErr } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', approveTarget.item_id)

      if (invUpdateErr) {
        toast.error('Failed to update stock. Approval cancelled.')
        return
      }

      // Only mark the request approved once stock has been deducted
      const { error: updateErr } = await supabase
        .from('issue_requests')
        .update({
          status: 'approved',
          review_note: approveNote.trim() || null,
          physical_status: 'pending_handover',
          reviewed_by: user?.id ?? null,
          assigned_mentor_email: approveMentorEmail,
        })
        .eq('id', approveTarget.id)

      if (updateErr) {
        toast.error('Stock updated but failed to mark approved. Check manually.')
        return
      }

      await logAudit(
        `Approved request for ${approveTarget.item_name} by ${approveTarget.student_email}, assigned mentor ${approveMentorEmail}`,
        'admin_action',
        {
          item_id: invItem.id,
          item_name: approveTarget.item_name,
          quantity_change: -approveTarget.quantity_requested,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
        },
      )

      toast.success('Request approved and mentor assigned')
      void notifyUser({
        targetUserId: approveTarget.student_id,
        title: 'Request approved',
        body: `Your request for ${approveTarget.item_name} x${approveTarget.quantity_requested} has been approved.`,
        createdByEmail: user?.email ?? 'unknown-admin',
      })
      setApproveTarget(null)
      setApproveMentorEmail('')
      setApproveNote('')
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['issue_requests'] })
    } catch {
      toast.error('Failed to approve request')
    } finally {
      setApproveLoading(false)
    }
  }

  // ── Reject issue request ──────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectTarget || !rejectNote.trim() || rejectLoading) return
    setRejectLoading(true)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({
          status: 'rejected',
          review_note: rejectNote.trim(),
          reviewed_by: user?.id ?? null,
        })
        .eq('id', rejectTarget.id)

      if (error) throw error

      await logAudit(
        `Rejected request for ${rejectTarget.item_name} by ${rejectTarget.student_email}`,
        'admin_action',
        {
          item_id: rejectTarget.item_id,
          item_name: rejectTarget.item_name,
          quantity_change: 0,
        },
      )

      toast.success('Request rejected')
      void notifyUser({
        targetUserId: rejectTarget.student_id,
        title: 'Request rejected',
        body: `Your request for ${rejectTarget.item_name} was rejected. Reason: ${rejectNote.trim()}`,
        createdByEmail: user?.email ?? 'unknown-admin',
      })
      setRejectTarget(null)
      setRejectNote('')
      void queryClient.invalidateQueries({ queryKey: ['issue_requests'] })
    } catch {
      toast.error('Failed to reject request')
    } finally {
      setRejectLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Pending Requests">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/[0.12] px-3 py-1.5 text-xs font-semibold text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Admin — Pending Review
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Pending Requests</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Review and approve or reject incoming issue requests
            </p>
          </div>
          <button
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['issue_requests'] })
              void queryClient.invalidateQueries({ queryKey: ['service_requests'] })
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]"
          >
            Refresh
          </button>
        </div>

        <RequestTypeTabs active={activeTab} onChange={setActiveTab} />

        {/* ── Pending Issue Requests ── */}
        {activeTab === 'equipment' && (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pending Issue Requests</h2>
            {pendingRequests.length > 0 && (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                {pendingRequests.length}
              </span>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No pending requests — all clear!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                    {['Student', 'Email', 'Item', 'Qty', 'Purpose', 'Estimate', 'Team', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {pendingRequests.map(req => (
                    <tr key={req.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-2 first:pl-0 font-semibold text-gray-900 dark:text-[#f4f4f6]">{req.student_name}</td>
                      <td className="py-3 px-2 font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</td>
                      <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                      <td className="py-3 px-2 max-w-[180px] truncate text-gray-500 dark:text-[#9a9aa6]">{req.purpose}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1">
                          {req.estimated_amount != null && (
                            <span className="text-gray-500 dark:text-[#9a9aa6] whitespace-nowrap">
                              {req.estimated_amount} {req.estimated_amount_unit}
                            </span>
                          )}
                          {req.stl_file_url ? (
                            <StlViewButton url={req.stl_file_url} />
                          ) : req.estimated_amount == null ? (
                            <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-2 max-w-[160px]"><TeamMembersBadgeList members={req.team_members} /></td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setApproveTarget(req); setApproveMentorEmail(''); setApproveNote('') }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-green-400/30 bg-green-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-green-400 transition hover:bg-green-400/[0.16]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectTarget(req); setRejectNote('') }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/25 bg-red-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-red-400 transition hover:bg-red-400/[0.14]"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* ── Pending Service Requests ── */}
        {activeTab === 'service' && (
          <ServiceRequestsPanel
            title="Pending Service Requests"
            onlyPending
            emptyMessage="No pending service requests — all clear!"
          />
        )}

      </div>

      {/* ── Approve Modal ── */}
      {approveTarget && (
        <Modal onClose={() => { setApproveTarget(null); setApproveMentorEmail(''); setApproveNote('') }}>
          <div className="w-full max-w-[460px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Approve Request</h2>
              <button
                onClick={() => { setApproveTarget(null); setApproveMentorEmail(''); setApproveNote('') }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{approveTarget.student_name}</span>
              {' '}·{' '}{approveTarget.item_name}{' '}×{' '}{approveTarget.quantity_requested}
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Assign Mentor <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <select
                value={approveMentorEmail}
                onChange={e => setApproveMentorEmail(e.target.value)}
                className="w-full appearance-none cursor-pointer rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
              >
                <option value="" disabled>Select a mentor...</option>
                {mentors.map(m => (
                  <option key={m.user_id} value={m.email}>{m.display_name ?? m.email} ({m.email})</option>
                ))}
              </select>
              {mentors.length === 0 && (
                <p className="mt-1.5 text-[11px] text-amber-400">No mentors found. Grant mentor access to a user first.</p>
              )}
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Note{' '}<span className="font-normal text-gray-400 dark:text-[#6e6e78]">(optional)</span>
              </label>
              <textarea
                value={approveNote}
                onChange={e => setApproveNote(e.target.value)}
                placeholder="Any notes for the student…"
                rows={2}
                className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-[#6e6e78]">
                The return deadline is set by the assigned mentor once they hand the item over, not here.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setApproveTarget(null); setApproveMentorEmail(''); setApproveNote('') }}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleApprove()}
                disabled={!approveMentorEmail || approveLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-green-500 to-green-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {approveLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <Modal onClose={() => { setRejectTarget(null); setRejectNote('') }}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Reject Request</h2>
              <button
                onClick={() => { setRejectTarget(null); setRejectNote('') }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{rejectTarget.student_name}</span>
              {' '}·{' '}{rejectTarget.item_name}{' '}×{' '}{rejectTarget.quantity_requested}
            </p>

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Reason <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Required — explain why this request is being rejected…"
                rows={3}
                className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectNote('') }}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={!rejectNote.trim() || rejectLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-red-500 to-red-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {rejectLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
