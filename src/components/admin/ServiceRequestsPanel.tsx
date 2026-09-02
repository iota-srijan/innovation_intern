import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminServiceRequests } from '../../hooks/useAdminServiceRequests'
import { useMentors } from '../../hooks/useMentors'
import { getStlPathFromUrl, getStlSignedUrl } from '../../lib/stlFiles'
import { supabase } from '../../lib/supabaseClient'
import { slotsOverlap } from '../../lib/scheduling'
import { notifyUser } from '../../lib/notify'
import { useAuth } from '../../context/AuthContext'
import type { ServiceRequest } from '../../types'
import { RequestSubmittedModal } from '../requests/RequestSubmittedModal'
import { TeamMembersBadgeList } from '../requests/TeamMembersBadgeList'
import type { GmailComposeParams } from '../../lib/gmail'

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

function ServiceStatusBadge({ status }: { status: ServiceRequest['status'] }) {
  if (status === 'pending')
    return <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Pending</span>
  if (status === 'approved')
    return <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Approved</span>
  return <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">Rejected</span>
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

interface ServiceRequestsPanelProps {
  title: string
  onlyPending: boolean
  emptyMessage: string
  // Only Super Admin assigns mentors on approve; plain Admin sees a
  // read-only mentor column instead once a mentor has been assigned.
  canAssignMentor?: boolean
}

export function ServiceRequestsPanel({ title, onlyPending, emptyMessage, canAssignMentor = false }: ServiceRequestsPanelProps) {
  const { user } = useAuth()
  const { requests, isLoading, approveServiceRequest, rejectServiceRequest, reassignMentor } = useAdminServiceRequests({
    onlyPending,
    refetchInterval: onlyPending ? 10000 : undefined,
  })
  const { mentors } = useMentors()

  // Approve modal
  const [approveTarget, setApproveTarget] = useState<ServiceRequest | null>(null)
  const [approveSlot, setApproveSlot] = useState('')
  const [approveDuration, setApproveDuration] = useState<number | ''>(30)
  const [approveNote, setApproveNote] = useState('')
  const [approveMentorEmail, setApproveMentorEmail] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<ServiceRequest | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // Reassign mentor modal (already-approved requests)
  const [reassignTarget, setReassignTarget] = useState<ServiceRequest | null>(null)
  const [reassignMentorEmail, setReassignMentorEmail] = useState('')
  const [reassignLoading, setReassignLoading] = useState(false)

  const [stlLoadingId, setStlLoadingId] = useState<string | null>(null)
  const [submittedGmail, setSubmittedGmail] = useState<GmailComposeParams | null>(null)

  const closeApprove = () => {
    setApproveTarget(null)
    setApproveSlot('')
    setApproveDuration(30)
    setApproveNote('')
    setApproveMentorEmail('')
    setSubmittedGmail(null)
  }

  const closeReject = () => {
    setRejectTarget(null)
    setRejectNote('')
  }

  // Step 1: validate the form and build the Gmail draft, but write nothing
  // to the database yet — the request stays 'pending' until
  // handleFinalizeApproval runs, which only happens once the admin
  // explicitly confirms they sent the email. This avoids the request
  // silently becoming "approved" if the admin closes the Gmail tab
  // mid-draft without actually sending it.
  const handlePrepareApproval = () => {
    if (!approveTarget || !approveSlot) return
    // No professor to CC means nothing to wait on — approve immediately,
    // same as the old behavior.
    if (!approveTarget.professor_email) {
      void handleFinalizeApproval()
      return
    }
    const slotIso = new Date(approveSlot).toISOString()
    const durationMins = Math.max(1, Number(approveDuration) || 30)
    const ccAddresses = [approveTarget.professor_email, canAssignMentor ? approveMentorEmail : null]
      .filter((e): e is string => !!e?.trim())
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .join(',')
    setSubmittedGmail({
      to: approveTarget.student_email,
      cc: ccAddresses,
      subject: `IdeaLab Service Request Approved — ${approveTarget.machine_name}`,
      body: [
        `Hi ${approveTarget.student_name},`,
        `Your service request on ${approveTarget.machine_name} has been approved.`,
        `Assigned slot: ${new Date(slotIso).toLocaleString()} (${durationMins} min)`,
        canAssignMentor && approveMentorEmail ? `Assigned mentor: ${approveMentorEmail}` : null,
        approveNote.trim() ? `Note: ${approveNote.trim()}` : null,
        `— OPJU IdeaLab Team`,
      ].filter((l): l is string => l !== null).join('\n\n'),
    })
  }

  // Step 2: the actual database write — only reached via the "I've sent it"
  // confirmation button in the Gmail-draft modal (or directly from step 1
  // for requests with no professor_email to wait on).
  const handleFinalizeApproval = async () => {
    if (!approveTarget || !approveSlot || approveLoading) return
    setApproveLoading(true)
    try {
      const slotIso = new Date(approveSlot).toISOString()
      const durationMins = Math.max(1, Number(approveDuration) || 30)

      // Prevent double-booking: check other already-approved requests on the
      // same machine for an overlapping slot before writing this one.
      const { data: existingBookings } = await supabase
        .from('service_requests')
        .select('student_name, assigned_slot, slot_duration_mins')
        .eq('machine_id', approveTarget.machine_id)
        .eq('status', 'approved')
        .not('assigned_slot', 'is', null)
        .neq('id', approveTarget.id)

      const conflict = (existingBookings ?? []).find(b =>
        b.assigned_slot && slotsOverlap(
          new Date(slotIso), durationMins,
          new Date(b.assigned_slot), b.slot_duration_mins ?? 30,
        )
      )
      if (conflict) {
        toast.error(
          `Slot conflicts with ${conflict.student_name}'s booking on ${approveTarget.machine_name} at ${new Date(conflict.assigned_slot!).toLocaleString()}. Choose a different time.`
        )
        return
      }

      await approveServiceRequest(approveTarget, {
        assignedSlot: slotIso,
        durationMins,
        reviewNote: approveNote,
        assignedMentorEmail: canAssignMentor ? approveMentorEmail : undefined,
      })
      toast.success('Service request approved')
      void notifyUser({
        targetUserId: approveTarget.student_id,
        title: 'Service request approved',
        body: `Your service request on ${approveTarget.machine_name} has been approved. Slot: ${new Date(slotIso).toLocaleString()} (${durationMins} min).`,
        createdByEmail: user?.email ?? 'unknown-admin',
      })

      setSubmittedGmail(null)
      closeApprove()
    } catch {
      toast.error('Failed to approve service request')
    } finally {
      setApproveLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectNote.trim() || rejectLoading) return
    setRejectLoading(true)
    try {
      await rejectServiceRequest(rejectTarget, rejectNote)
      toast.success('Service request rejected')
      void notifyUser({
        targetUserId: rejectTarget.student_id,
        title: 'Service request rejected',
        body: `Your service request on ${rejectTarget.machine_name} was rejected. Reason: ${rejectNote.trim()}`,
        createdByEmail: user?.email ?? 'unknown-admin',
      })
      closeReject()
    } catch {
      toast.error('Failed to reject service request')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleReassign = async () => {
    if (!reassignTarget || !reassignMentorEmail || reassignLoading) return
    setReassignLoading(true)
    try {
      await reassignMentor(reassignTarget, reassignMentorEmail)
      toast.success('Mentor reassigned')
      setReassignTarget(null)
      setReassignMentorEmail('')
    } catch {
      toast.error('Failed to reassign mentor')
    } finally {
      setReassignLoading(false)
    }
  }

  const handleViewStl = async (req: ServiceRequest) => {
    if (!req.stl_file_url) return
    setStlLoadingId(req.id)
    try {
      const filePath = getStlPathFromUrl(req.stl_file_url)
      const signedUrl = await getStlSignedUrl(filePath)
      if (!signedUrl) {
        toast.error('Failed to generate download link')
        return
      }
      window.open(signedUrl, '_blank')
    } finally {
      setStlLoadingId(null)
    }
  }

  return (
    <>
      <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
          {requests.length > 0 && (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              {requests.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                  {[
                    'Student', 'Machine', 'Dimensions', 'Material', 'Infill', 'Copies', 'Purpose', 'Team', 'STL File',
                    ...(onlyPending ? [] : ['Status', 'Mentor']),
                    'Actions',
                  ].map(h => (
                    <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {requests.map(req => {
                  const dims = req.dim_l != null && req.dim_w != null && req.dim_h != null
                    ? `${req.dim_l}x${req.dim_w}x${req.dim_h} mm`
                    : '—'

                  return (
                    <tr key={req.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-2 first:pl-0">
                        <div className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{req.student_name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                      </td>
                      <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.machine_name}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6] whitespace-nowrap">{dims}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.material_type ?? '—'}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.infill_percent != null ? `${req.infill_percent}%` : '—'}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.copies}</td>
                      <td className="py-3 px-2 max-w-[180px] text-gray-500 dark:text-[#9a9aa6]">{truncate(req.purpose)}</td>
                      <td className="py-3 px-2 max-w-[160px]"><TeamMembersBadgeList members={req.team_members} /></td>
                      <td className="py-3 px-2">
                        {req.stl_file_url ? (
                          <button
                            onClick={() => void handleViewStl(req)}
                            disabled={stlLoadingId === req.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/30 bg-orange-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50"
                          >
                            {stlLoadingId === req.id && <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />}
                            View STL
                          </button>
                        ) : (
                          <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
                        )}
                      </td>
                      {!onlyPending && (
                        <>
                          <td className="py-3 px-2"><ServiceStatusBadge status={req.status} /></td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">
                            <div>{req.assigned_mentor_email ?? '—'}</div>
                            {canAssignMentor && req.status === 'approved' && (
                              <button
                                onClick={() => { setReassignTarget(req); setReassignMentorEmail(req.assigned_mentor_email ?? '') }}
                                className="cursor-pointer text-[10px] font-semibold text-orange-400 hover:text-orange-300"
                              >
                                Reassign
                              </button>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-2">
                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setApproveTarget(req); setApproveSlot(''); setApproveDuration(30); setApproveNote(''); setApproveMentorEmail('') }}
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
        )}
      </div>

      {/* ── Approve Modal ── */}
      {approveTarget && !submittedGmail && (
        <Modal onClose={closeApprove}>
          <div className="w-full max-w-[460px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Approve Service Request</h2>
              <button
                onClick={closeApprove}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{approveTarget.student_name}</span>
              {' '}·{' '}{approveTarget.machine_name}
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">Student</label>
              <input
                type="text"
                value={approveTarget.student_name}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0d0a08]/60 px-3 py-[11px] text-[14px] text-gray-500 dark:text-[#9a9aa6] outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">Machine</label>
              <input
                type="text"
                value={approveTarget.machine_name}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0d0a08]/60 px-3 py-[11px] text-[14px] text-gray-500 dark:text-[#9a9aa6] outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Assigned Slot <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="datetime-local"
                value={approveSlot}
                onChange={e => setApproveSlot(e.target.value)}
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-[#6e6e78]">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Checked against this machine's other approved bookings before confirming.
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Duration (minutes) <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={approveDuration}
                onChange={e => setApproveDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            {canAssignMentor && (
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Assign Mentor <span className="font-normal text-gray-400 dark:text-[#6e6e78]">(optional)</span>
                </label>
                <select
                  value={approveMentorEmail}
                  onChange={e => setApproveMentorEmail(e.target.value)}
                  className="w-full appearance-none cursor-pointer rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">No mentor</option>
                  {mentors.map(m => (
                    <option key={m.user_id} value={m.email}>{m.display_name ?? m.email} ({m.email})</option>
                  ))}
                </select>
                {mentors.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-400">No mentors found. Grant mentor access to a user first.</p>
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Note to Student{' '}<span className="font-normal text-gray-400 dark:text-[#6e6e78]">(optional)</span>
              </label>
              <textarea
                value={approveNote}
                onChange={e => setApproveNote(e.target.value)}
                placeholder="Any notes for the student…"
                rows={2}
                className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d0a08]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeApprove}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handlePrepareApproval}
                disabled={!approveSlot || !approveDuration || approveLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-green-500 to-green-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {approveLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Continue to Email
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <Modal onClose={closeReject}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Reject Service Request</h2>
              <button
                onClick={closeReject}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{rejectTarget.student_name}</span>
              {' '}·{' '}{rejectTarget.machine_name}
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
                onClick={closeReject}
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

      {/* ── Reassign Mentor Modal ── */}
      {reassignTarget && (
        <Modal onClose={() => { setReassignTarget(null); setReassignMentorEmail('') }}>
          <div className="w-full max-w-[420px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Reassign Mentor</h2>
              <button
                onClick={() => { setReassignTarget(null); setReassignMentorEmail('') }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{reassignTarget.student_name}</span>
              {' '}·{' '}{reassignTarget.machine_name}
              {' '}· currently{' '}<span className="font-mono">{reassignTarget.assigned_mentor_email ?? 'unassigned'}</span>
            </p>

            <div className="mb-6">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                New Mentor <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <select
                value={reassignMentorEmail}
                onChange={e => setReassignMentorEmail(e.target.value)}
                className="w-full appearance-none cursor-pointer rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
              >
                <option value="" disabled>Select a mentor...</option>
                {mentors.map(m => (
                  <option key={m.user_id} value={m.email}>{m.display_name ?? m.email} ({m.email})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setReassignTarget(null); setReassignMentorEmail('') }}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReassign()}
                disabled={!reassignMentorEmail || reassignMentorEmail === reassignTarget.assigned_mentor_email || reassignLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {reassignLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Confirm Reassignment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {submittedGmail && (
        <RequestSubmittedModal
          title="Send the approval email"
          description="This request stays pending until you confirm you've sent this email. Open the draft, review it, hit Send in Gmail, then come back and confirm below."
          gmail={submittedGmail}
          onClose={closeApprove}
          closeLabel="Cancel — Don't Approve"
          confirmLabel="I've Sent It — Approve Request"
          confirmLoading={approveLoading}
          onConfirm={() => void handleFinalizeApproval()}
        />
      )}
    </>
  )
}
