import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap, ClipboardCheck, Clock, Package, AlertTriangle,
  Search, X, Send, Users, Package as PackageIcon, Info, Wrench, Check, Pencil,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { InventoryManagementPanel } from './AdminInventoryPage'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { getStlPathFromUrl, getStlSignedUrl } from '../lib/stlFiles'
import { notifySuperAdmins } from '../lib/notify'
import { TeamMembersBadgeList } from '../components/requests/TeamMembersBadgeList'
import type { ServiceRequest, TeamMember } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────

type RoleType = 'student' | 'faculty' | 'mentor' | 'admin' | 'super_admin' | 'banned'
type IssueStatus = 'pending' | 'approved' | 'rejected'
type PhysicalStatus = 'pending_handover' | 'issued' | 'returned' | 'consumed'
type Section = 'dashboard' | 'assigned' | 'service' | 'inventory' | 'users'
type AssignedFilter = 'all' | 'approved' | 'issued' | 'returned' | 'overdue'

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
  physical_status?: PhysicalStatus | null
  issued_at?: string | null
  returned_at?: string | null
  assigned_mentor_email?: string | null
  team_members?: TeamMember[]
}

interface UserRow {
  user_id: string
  email: string
  role: RoleType | null
  display_name: string | null
  last_sign_in_at: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function isOverdue(req: IssueRequest, todayStr: string): boolean {
  return req.status === 'approved' && req.physical_status === 'issued' && !!req.return_deadline && req.return_deadline < todayStr
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: RoleType }) {
  const cls: Record<RoleType, string> = {
    student:     'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    faculty:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
    mentor:      'text-violet-400 bg-violet-400/10 border-violet-400/20',
    admin:       'text-orange-400 bg-orange-400/10 border-orange-400/20',
    super_admin: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    banned:      'text-red-400 bg-red-400/10 border-red-400/20',
  }
  const label: Record<RoleType, string> = {
    student: 'Student', faculty: 'Faculty', mentor: 'Mentor',
    admin: 'Admin', super_admin: 'Super Admin', banned: 'Banned',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls[role]}`}>
      {label[role]}
    </span>
  )
}

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  if (status === 'pending')
    return <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Pending</span>
  if (status === 'approved')
    return <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Approved</span>
  return <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">Rejected</span>
}

function PhysStatusBadge({ req, overdue }: { req: IssueRequest; overdue: boolean }) {
  if (req.status !== 'approved') return <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
  if (overdue) return <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">Overdue</span>
  const ps: PhysicalStatus = req.physical_status ?? 'pending_handover'
  if (ps === 'pending_handover')
    return <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Awaiting Handover</span>
  if (ps === 'issued')
    return <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">With Student</span>
  if (ps === 'returned')
    return <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Returned</span>
  return <span className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-300">Consumed</span>
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

// ─── Section nav ────────────────────────────────────────────────────────────────

const SECTION_TABS: { key: Section; label: string; icon: typeof ClipboardCheck }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: GraduationCap },
  { key: 'assigned', label: 'Assigned Requests', icon: ClipboardCheck },
  { key: 'service', label: 'Service Requests', icon: Wrench },
  { key: 'inventory', label: 'Inventory', icon: PackageIcon },
  { key: 'users', label: 'User Management', icon: Users },
]

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5">
      {SECTION_TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold transition-all ${
            active === key
              ? 'border-transparent bg-[#f97316] text-white'
              : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MentorDashboard() {
  const { user, displayName } = useAuth()
  const queryClient = useQueryClient()
  const mentorEmail = user?.email ?? ''

  const [searchParams] = useSearchParams()
  const initialSection = (searchParams.get('section') as Section | null)
  const [section, setSection] = useState<Section>(
    initialSection && SECTION_TABS.some(s => s.key === initialSection) ? initialSection : 'dashboard'
  )
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>('all')
  const [assignedSearch, setAssignedSearch] = useState('')
  const [rowActionId, setRowActionId] = useState<string | null>(null)

  // Inline return-deadline editing — the mentor is the one actually handing
  // the item over, so they can set/adjust the deadline themselves rather
  // than being stuck with whatever the admin picked at approval time.
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null)
  const [deadlineDraft, setDeadlineDraft] = useState('')

  // Send Reminder modal
  const [reminderTarget, setReminderTarget] = useState<IssueRequest | null>(null)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderSending, setReminderSending] = useState(false)

  // User management (limited)
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const initRef = useRef(false)
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Fetch requests assigned to this mentor ───────────────────────────────────

  const { data: assignedData, isLoading: assignedLoading } = useQuery({
    queryKey: ['mentor-assigned-requests', mentorEmail],
    queryFn: async () => {
      if (!mentorEmail) return []
      const { data, error } = await supabase
        .from('issue_requests')
        .select('*')
        .eq('assigned_mentor_email', mentorEmail)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as IssueRequest[]
    },
    enabled: !!mentorEmail,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })
  const assignedRequests = assignedData ?? []

  // ── Fetch service requests assigned to this mentor ───────────────────────────
  // refetchOnWindowFocus so a request reassigned to another mentor while this
  // tab is backgrounded disappears from this list on return, without a manual refresh.

  const { data: mentorServiceData, isLoading: mentorServiceLoading } = useQuery({
    queryKey: ['mentor-assigned-service-requests', mentorEmail],
    queryFn: async () => {
      if (!mentorEmail) return []
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('assigned_mentor_email', mentorEmail)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ServiceRequest[]
    },
    enabled: !!mentorEmail,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })
  const mentorServiceRequests = mentorServiceData ?? []
  const [stlLoadingId, setStlLoadingId] = useState<string | null>(null)

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

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const stats = {
    assignedRequests: assignedRequests.length,
    pendingReturns: assignedRequests.filter(r => r.status === 'approved' && r.physical_status === 'issued').length,
    itemsIssued: assignedRequests
      .filter(r => r.physical_status === 'issued' || r.physical_status === 'returned')
      .reduce((sum, r) => sum + (r.quantity_requested ?? 0), 0),
    overdue: assignedRequests.filter(r => isOverdue(r, todayStr)).length,
  }

  const statCards = [
    { label: 'Assigned Requests', value: stats.assignedRequests, icon: ClipboardCheck, desc: 'Total assigned to you', cls: 'text-orange-300', bgCls: 'bg-orange-400/10', iconCls: 'text-orange-300', dotCls: 'bg-orange-300' },
    { label: 'Pending Returns', value: stats.pendingReturns, icon: Clock, desc: 'Awaiting return', cls: 'text-yellow-400', bgCls: 'bg-yellow-400/10', iconCls: 'text-yellow-400', dotCls: 'bg-yellow-400' },
    { label: 'Items Issued', value: stats.itemsIssued, icon: Package, desc: 'Physically handed over', cls: 'text-blue-400', bgCls: 'bg-blue-400/10', iconCls: 'text-blue-400', dotCls: 'bg-blue-400' },
    { label: 'Overdue Returns', value: stats.overdue, icon: AlertTriangle, desc: 'Past deadline', cls: 'text-red-400', bgCls: 'bg-red-400/10', iconCls: 'text-red-400', dotCls: 'bg-red-400' },
  ] as const

  // ── Fetch users (limited management) ─────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        setUsersError(error.message)
        setUsers([])
      } else {
        setUsers((data ?? []) as UserRow[])
        setUsersError(null)
      }
    } catch {
      setUsersError('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    fetchUsers()
  }, [fetchUsers])

  // ── Audit log helper ──────────────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string, actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action') => {
    try {
      await supabase.from('audit_log').insert({ actor_email: mentorEmail || 'unknown-mentor', action, action_type: actionType })
    } catch {
      // audit failures are non-fatal
    }
  }, [mentorEmail])

  // ── Mark Issued / Returned ───────────────────────────────────────────────────

  const handleMarkIssued = async (req: IssueRequest) => {
    if (rowActionId) return
    setRowActionId(req.id)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({ physical_status: 'issued', issued_at: new Date().toISOString() })
        .eq('id', req.id)
      if (error) throw error
      await logAudit(`Marked ${req.item_name} as issued to ${req.student_email}`, 'admin_action')
      toast.success('Marked as issued')
      void queryClient.invalidateQueries({ queryKey: ['mentor-assigned-requests'] })
    } catch {
      toast.error('Failed to mark as issued')
    } finally {
      setRowActionId(null)
    }
  }

  const handleMarkReturned = async (req: IssueRequest) => {
    if (rowActionId) return
    setRowActionId(req.id)
    try {
      const { error: reqErr } = await supabase
        .from('issue_requests')
        .update({ physical_status: 'returned', returned_at: new Date().toISOString() })
        .eq('id', req.id)
      if (reqErr) throw reqErr

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

      await logAudit(`Marked ${req.item_name} as returned by ${req.student_email}`, 'admin_action')
      void notifySuperAdmins({
        title: 'Item returned',
        body: `${req.item_name} x${req.quantity_requested} was returned by ${req.student_email}, confirmed by ${mentorEmail || 'their mentor'}.`,
        createdByEmail: mentorEmail || 'unknown-mentor',
      })
      toast.success('Item returned, inventory updated')
      void queryClient.invalidateQueries({ queryKey: ['mentor-assigned-requests'] })
    } catch {
      toast.error('Failed to mark as returned')
    } finally {
      setRowActionId(null)
    }
  }

  // ── Edit return deadline ────────────────────────────────────────────────────

  const handleSaveDeadline = async (req: IssueRequest) => {
    if (!deadlineDraft || rowActionId) return
    setRowActionId(req.id)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({ return_deadline: deadlineDraft })
        .eq('id', req.id)
      if (error) throw error
      await logAudit(`Set return deadline for ${req.item_name} (${req.student_email}) to ${deadlineDraft}`, 'admin_action')
      toast.success('Return deadline updated')
      setEditingDeadlineId(null)
      void queryClient.invalidateQueries({ queryKey: ['mentor-assigned-requests'] })
    } catch {
      toast.error('Failed to update return deadline')
    } finally {
      setRowActionId(null)
    }
  }

  // ── Send Reminder ─────────────────────────────────────────────────────────────

  const openReminder = (req: IssueRequest) => {
    const overdue = isOverdue(req, todayStr)
    const deadlineStr = req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : 'an unspecified date'
    setReminderMessage(
      overdue
        ? `Hi ${req.student_name}, your borrowed item "${req.item_name}" was due on ${deadlineStr} and is now overdue. Please return it to IdeaLab immediately.`
        : `Hi ${req.student_name}, this is a reminder that "${req.item_name}" is due for return on ${deadlineStr}. Please plan your return accordingly.`
    )
    setReminderTarget(req)
  }

  const closeReminder = () => {
    setReminderTarget(null)
    setReminderMessage('')
  }

  const handleSendReminder = async () => {
    if (!reminderTarget || !reminderMessage.trim() || reminderSending) return
    if (!reminderTarget.student_id) {
      toast.error('Cannot send reminder: student account is not linked to this request')
      return
    }
    setReminderSending(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        title: 'Return Reminder',
        body: reminderMessage.trim(),
        created_by_email: mentorEmail || 'unknown-mentor',
        target_user_id: reminderTarget.student_id,
        is_active: true,
      })
      if (error) throw error
      toast.success('Reminder sent to student')
      await logAudit(`Sent return reminder to ${reminderTarget.student_email} for ${reminderTarget.item_name}`, 'CREATE')
      closeReminder()
    } catch {
      toast.error('Failed to send reminder')
    } finally {
      setReminderSending(false)
    }
  }

  // ── User management actions (limited: ban/unban + grant/revoke faculty) ──────

  const handleGrantFaculty = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'faculty' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} granted faculty access`)
      await fetchUsers()
      await logAudit(`Granted faculty access to ${row.email}`, 'UPDATE')
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRevokeFaculty = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'student' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} revoked to student`)
      await fetchUsers()
      await logAudit(`Revoked faculty access from ${row.email}`, 'UPDATE')
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleBanUser = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'banned' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} has been banned`)
      await fetchUsers()
      await logAudit(`Banned student ${row.email}`, 'admin_action')
    } catch {
      toast.error('Failed to ban user')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUnbanUser = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'student' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} has been unbanned`)
      await fetchUsers()
      await logAudit(`Unbanned student ${row.email}`, 'admin_action')
    } catch {
      toast.error('Failed to unban user')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const filteredAssigned = assignedRequests.filter(req => {
    const overdue = isOverdue(req, todayStr)
    if (assignedFilter === 'overdue' && !overdue) return false
    if (assignedFilter === 'approved' && !(req.status === 'approved' && req.physical_status === 'pending_handover')) return false
    if (assignedFilter === 'issued' && !(req.physical_status === 'issued' && !overdue)) return false
    if (assignedFilter === 'returned' && req.physical_status !== 'returned') return false
    const q = assignedSearch.trim().toLowerCase()
    if (q && !req.student_name.toLowerCase().includes(q) && !req.item_name.toLowerCase().includes(q)) return false
    return true
  })

  const userQ = userSearch.trim().toLowerCase()
  const filteredUsers = userQ
    ? users.filter(u => u.email.toLowerCase().includes(userQ) || (u.display_name?.toLowerCase() ?? '').includes(userQ))
    : users

  const initials = (displayName || mentorEmail).split(' ').filter(Boolean).map(w => w[0]?.toUpperCase()).join('').slice(0, 2) || 'M'

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Mentors Portal — IdeaLab">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/[0.12] px-3 py-1.5 text-xs font-semibold text-violet-300">
              <GraduationCap className="h-3.5 w-3.5" />
              Mentor View — {initials}
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">
              {SECTION_TABS.find(s => s.key === section)?.label ?? 'Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">Your assigned equipment and student overview</p>
          </div>
        </div>

        <SectionNav active={section} onChange={setSection} />

        {/* ════ DASHBOARD ════ */}
        {section === 'dashboard' && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {statCards.map(({ label, value, icon: Icon, dotCls, bgCls, iconCls, cls, desc }) => (
                <div key={label} className="rounded-[13px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">{label}</span>
                    <div className={`rounded-lg p-1.5 ${bgCls}`}>
                      <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
                    </div>
                  </div>
                  <div className={`text-[26px] font-extrabold tabular-nums leading-none ${cls}`}>
                    {assignedLoading ? '—' : value}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#6e6e78]">
                    <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
                    {desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">My Assigned Requests</h2>
                  {stats.overdue > 0 && (
                    <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400">{stats.overdue} overdue</span>
                  )}
                </div>
                <button onClick={() => setSection('assigned')} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]">
                  View All
                </button>
              </div>
              {assignedLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                </div>
              ) : assignedRequests.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No requests assigned to you yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        {['Student', 'Item', 'Qty', 'Status', 'Return By', 'Physical Status'].map(h => (
                          <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {assignedRequests.slice(0, 5).map(req => {
                        const overdue = isOverdue(req, todayStr)
                        return (
                          <tr key={req.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${overdue ? 'bg-red-400/[0.03]' : ''}`}>
                            <td className="py-3 px-2 first:pl-0">
                              <div className={`font-semibold ${overdue ? 'text-red-400' : 'text-gray-900 dark:text-[#f4f4f6]'}`}>{req.student_name}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                            <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                            <td className="py-3 px-2"><IssueStatusBadge status={req.status} /></td>
                            <td className={`py-3 px-2 whitespace-nowrap ${overdue ? 'font-semibold text-red-400' : 'text-gray-500 dark:text-[#6e6e78]'}`}>
                              {req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-2"><PhysStatusBadge req={req} overdue={overdue} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════ ASSIGNED REQUESTS ════ */}
        {section === 'assigned' && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {(['all', 'approved', 'issued', 'returned', 'overdue'] as AssignedFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setAssignedFilter(f)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium capitalize transition-all ${
                    assignedFilter === f
                      ? 'border-transparent bg-[#f97316] text-white'
                      : f === 'overdue'
                        ? 'border-red-400/30 text-red-400 hover:bg-red-400/[0.08]'
                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Assigned</h2>
                <span className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-[#6e6e78]">
                  {assignedRequests.length} requests
                </span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                <input
                  type="text"
                  value={assignedSearch}
                  onChange={e => setAssignedSearch(e.target.value)}
                  placeholder="Search student or item…"
                  className="w-56 rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] py-2 pl-8 pr-3 text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400/60"
                />
              </div>
            </div>

            {assignedLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : filteredAssigned.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No requests match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                      {['Student', 'Item', 'Qty', 'Status', 'Team', 'Return By', 'Physical Status', 'Actions'].map(h => (
                        <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filteredAssigned.map(req => {
                      const overdue = isOverdue(req, todayStr)
                      const isLoading = rowActionId === req.id
                      const ps: PhysicalStatus = req.physical_status ?? 'pending_handover'
                      return (
                        <tr key={req.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${overdue ? 'bg-red-400/[0.03]' : ''}`}>
                          <td className="py-3 px-2 first:pl-0">
                            <div className={`font-semibold ${overdue ? 'text-red-400' : 'text-gray-900 dark:text-[#f4f4f6]'}`}>{req.student_name}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                          </td>
                          <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                          <td className="py-3 px-2"><IssueStatusBadge status={req.status} /></td>
                          <td className="py-3 px-2 max-w-[160px]"><TeamMembersBadgeList members={req.team_members} /></td>
                          <td className={`py-3 px-2 whitespace-nowrap ${overdue ? 'font-semibold text-red-400' : 'text-gray-500 dark:text-[#6e6e78]'}`}>
                            {editingDeadlineId === req.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  value={deadlineDraft}
                                  onChange={e => setDeadlineDraft(e.target.value)}
                                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-2 py-1 text-[11px] text-gray-900 dark:text-white outline-none focus:border-orange-400"
                                />
                                <button
                                  onClick={() => void handleSaveDeadline(req)}
                                  disabled={!deadlineDraft || rowActionId === req.id}
                                  title="Save"
                                  className="cursor-pointer rounded-md p-1 text-green-400 transition hover:bg-green-400/10 disabled:opacity-50"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingDeadlineId(null)}
                                  title="Cancel"
                                  className="cursor-pointer rounded-md p-1 text-gray-400 transition hover:bg-white/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : ps === 'returned' ? (
                              req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : '—'
                            ) : (
                              <button
                                onClick={() => { setEditingDeadlineId(req.id); setDeadlineDraft(req.return_deadline ?? '') }}
                                title="Click to edit"
                                className="inline-flex cursor-pointer items-center gap-1 hover:text-orange-400"
                              >
                                {req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : 'Set date'}
                                <Pencil className="h-2.5 w-2.5 opacity-50" />
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-2"><PhysStatusBadge req={req} overdue={overdue} /></td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {req.status === 'approved' && ps === 'pending_handover' && (
                                <button
                                  onClick={() => handleMarkIssued(req)}
                                  disabled={isLoading}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/30 bg-orange-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50"
                                >
                                  {isLoading && <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />}
                                  Mark Issued
                                </button>
                              )}
                              {req.status === 'approved' && ps === 'issued' && (
                                <>
                                  <button
                                    onClick={() => handleMarkReturned(req)}
                                    disabled={isLoading}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-green-400/30 bg-green-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-green-400 transition hover:bg-green-400/[0.16] disabled:opacity-50"
                                  >
                                    {isLoading && <span className="h-3 w-3 animate-spin rounded-full border border-green-400 border-t-transparent" />}
                                    Mark Returned
                                  </button>
                                  <button
                                    onClick={() => openReminder(req)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-teal-400/30 bg-teal-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-teal-400 transition hover:bg-teal-400/[0.16]"
                                  >
                                    <Send className="h-3 w-3" />
                                    Send Reminder
                                  </button>
                                </>
                              )}
                              {ps === 'returned' && (
                                <span className="text-gray-400 dark:text-[#4b4b57]">Completed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ SERVICE REQUESTS ════ */}
        {section === 'service' && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">My Assigned Service Requests</h2>
              <span className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-[#6e6e78]">
                {mentorServiceRequests.length} request{mentorServiceRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {mentorServiceLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : mentorServiceRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No service requests assigned to you yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                      {['Student', 'Machine', 'Material', 'Dimensions', 'Team', 'Slot', 'Duration', 'STL File'].map(h => (
                        <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {mentorServiceRequests.map(req => {
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
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.material_type ?? '—'}</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6] whitespace-nowrap">{dims}</td>
                          <td className="py-3 px-2 max-w-[160px]"><TeamMembersBadgeList members={req.team_members} /></td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6] whitespace-nowrap">
                            {req.assigned_slot ? new Date(req.assigned_slot).toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">
                            {req.slot_duration_mins != null ? `${req.slot_duration_mins} min` : '—'}
                          </td>
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ INVENTORY ════ */}
        {section === 'inventory' && <InventoryManagementPanel />}

        {/* ════ USER MANAGEMENT (limited) ════ */}
        {section === 'users' && (
          <>
            <div className="mb-5 flex items-start gap-2.5 rounded-[11px] border border-violet-400/20 bg-violet-400/[0.07] px-4 py-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
              <p className="text-[12.5px] leading-relaxed text-violet-300">
                You can <strong className="text-violet-400">Ban / Unban students</strong> and <strong className="text-violet-400">Grant / Revoke Faculty</strong>. Mentor role assignment is restricted to Super Admins only.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Accounts</h2>
                  {!usersLoading && !usersError && (
                    <span className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-[#6e6e78]">
                      {users.length} account{users.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-56 rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] py-2 pl-8 pr-3 text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400/60"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                </div>
              ) : usersError ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-300">{usersError}</div>
              ) : filteredUsers.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No users match your search.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        {['Name / Email', 'Role', 'Last Active', 'Actions'].map(h => (
                          <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {filteredUsers.map(row => {
                        const role: RoleType = (row.role as RoleType) ?? 'student'
                        const busy = updatingId === row.user_id
                        return (
                          <tr key={row.user_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="py-3.5 px-2 first:pl-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-[#f4f4f6]">{row.display_name || row.email.split('@')[0]}</div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">{row.email}</span>
                                {role === 'banned' && (
                                  <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-400">BANNED</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-2"><RoleBadge role={role} /></td>
                            <td className="py-3.5 px-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-[#6e6e78]">
                                <Clock className="h-3 w-3 shrink-0" />
                                {timeAgo(row.last_sign_in_at)}
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              {role === 'admin' || role === 'super_admin' || role === 'mentor' ? (
                                <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
                              ) : role === 'banned' ? (
                                <button onClick={() => handleUnbanUser(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-green-400/30 bg-green-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-green-400 transition hover:bg-green-400/[0.16] disabled:opacity-50">
                                  {busy && <span className="h-3 w-3 animate-spin rounded-full border border-green-400 border-t-transparent" />}
                                  Unban
                                </button>
                              ) : role === 'student' ? (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleGrantFaculty(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/40 bg-orange-400/[0.08] px-3 py-1.5 text-[12px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50">
                                    {busy && <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />}
                                    Grant Faculty
                                  </button>
                                  <button onClick={() => handleBanUser(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50">
                                    {busy && <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />}
                                    Ban
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleRevokeFaculty(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50">
                                  {busy && <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />}
                                  Revoke Faculty
                                </button>
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
          </>
        )}

      </div>

      {/* ── Send Reminder Modal ── */}
      {reminderTarget && (
        <Modal onClose={closeReminder}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Send Reminder</h2>
              <button onClick={closeReminder} className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 rounded-[10px] border border-orange-400/20 bg-orange-400/[0.07] px-3.5 py-3">
              <div className="mb-1 flex justify-between gap-2 text-[12.5px]">
                <span className="text-gray-500 dark:text-[#9a9aa6]">Student</span>
                <span className="font-medium text-gray-900 dark:text-white">{reminderTarget.student_name}</span>
              </div>
              <div className="mb-1 flex justify-between gap-2 text-[12.5px]">
                <span className="text-gray-500 dark:text-[#9a9aa6]">Item</span>
                <span className="font-medium text-gray-900 dark:text-white">{reminderTarget.item_name}</span>
              </div>
              <div className="flex justify-between gap-2 text-[12.5px]">
                <span className="text-gray-500 dark:text-[#9a9aa6]">Return Deadline</span>
                <span className={`font-medium ${isOverdue(reminderTarget, todayStr) ? 'text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {reminderTarget.return_deadline ? new Date(reminderTarget.return_deadline).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">Message</label>
            <textarea
              value={reminderMessage}
              onChange={e => setReminderMessage(e.target.value)}
              placeholder="Write a reminder message to the student…"
              rows={4}
              className="mb-2 w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400"
            />
            {isOverdue(reminderTarget, todayStr) && (
              <p className="mb-2 flex items-center gap-1.5 text-[11.5px] text-red-400">
                <AlertTriangle className="h-3 w-3" />
                This item is overdue. The notification will be marked urgent.
              </p>
            )}
            <p className="mb-6 text-[11.5px] text-gray-400 dark:text-[#6e6e78]">The student will receive a notification in their IdeaLab portal.</p>

            <div className="flex justify-end gap-3">
              <button onClick={closeReminder} className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                Cancel
              </button>
              <button
                onClick={() => void handleSendReminder()}
                disabled={!reminderMessage.trim() || reminderSending}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-teal-500 to-teal-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {reminderSending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send Notification
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
