import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Shield, Users, Package, Clock, ClipboardList, ScrollText, GraduationCap,
  Plus, X, RefreshCw, Search, Download, FileSpreadsheet, Timer, TrendingUp, Archive,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AppShell } from '../components/layout/AppShell'
import { RequestTypeTabs, type RequestTypeTab } from '../components/admin/RequestTypeTabs'
import { ServiceRequestsPanel } from '../components/admin/ServiceRequestsPanel'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { getAdminEmail } from '../lib/adminUtils'
import { RequestSubmittedModal } from '../components/requests/RequestSubmittedModal'
import { TeamMembersBadgeList } from '../components/requests/TeamMembersBadgeList'
import { StlViewButton } from '../components/requests/StlViewButton'
import type { GmailComposeParams } from '../lib/gmail'
import { useMentors } from '../hooks/useMentors'
import { notifyUser } from '../lib/notify'
import type { TeamMember, ServiceRequest } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────

type RoleType = 'student' | 'faculty' | 'mentor' | 'admin' | 'super_admin' | 'banned'
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action'
type IssueStatus = 'pending' | 'approved' | 'rejected'
type PhysicalStatus = 'pending_handover' | 'issued' | 'returned' | 'consumed'
type Section = 'dashboard' | 'pending' | 'allreqs' | 'users' | 'audit' | 'analytics'
type AllRequestsFilter = 'All' | 'Pending' | 'Approved' | 'Rejected'
type AuditTab = 'recent' | 'export'

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
  assigned_mentor_email?: string | null
  professor_email?: string | null
  team_members?: TeamMember[]
  archived_at?: string | null
  estimated_amount?: number | null
  estimated_amount_unit?: string | null
  stl_file_url?: string | null
  stl_file_name?: string | null
}

interface UserRow {
  user_id: string
  email: string
  role: RoleType | null
  display_name: string | null
  last_sign_in_at: string | null
}

interface Stats {
  totalUsers: number
  pendingRequests: number
  totalItems: number
  activeMentors: number
  avgProcessingHours: number
}

interface AuditEntry {
  id: string
  actor_email: string | null
  action: string
  action_type: ActionType
  item_name?: string | null
  quantity_change?: number | null
  created_at: string
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

function formatTs(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Custom date-range report export ────────────────────────────────────────
// Standalone (not a component method) so it can be imported and called from
// any UI surface without depending on SuperAdminDashboard's local state.

interface InventoryItemRow {
  id: string
  name: string
  sku: string | null
  quantity: number
  reorder_threshold: number | null
  supplier: string | null
  unit_price: number | null
  status: string | null
}

// eslint-disable-next-line react-refresh/only-export-components -- intentional non-component export, kept in this file per requirements
export async function exportCustomRangeReport(fromDate: string, toDate: string) {
  const [issueRes, serviceRes, auditRes, inventoryRes] = await Promise.all([
    supabase
      .from('issue_requests')
      .select('*')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('service_requests')
      .select('*')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_log')
      .select('*')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('inventory_items')
      .select('*'),
  ])

  if (issueRes.error) throw issueRes.error
  if (serviceRes.error) throw serviceRes.error
  if (auditRes.error) throw auditRes.error
  if (inventoryRes.error) throw inventoryRes.error

  const issueRows = ((issueRes.data ?? []) as IssueRequest[]).map(r => ({
    'Student Name': r.student_name,
    'Student Email': r.student_email,
    Item: r.item_name,
    Quantity: r.quantity_requested,
    Status: r.status,
    Purpose: r.purpose,
    'Submitted At': formatTs(r.created_at),
    'Return Deadline': r.return_deadline ?? '—',
    'Assigned Mentor': r.assigned_mentor_email ?? '—',
    'Physical Status': r.physical_status ?? '—',
  }))

  const serviceRows = ((serviceRes.data ?? []) as ServiceRequest[]).map(r => ({
    Student: r.student_name,
    Email: r.student_email,
    Machine: r.machine_name,
    Material: r.material_type ?? '—',
    Copies: r.copies,
    Purpose: r.purpose,
    Status: r.status,
    'Submitted At': formatTs(r.created_at),
    'Assigned Slot': r.assigned_slot ? formatTs(r.assigned_slot) : '—',
    'Assigned Mentor': r.assigned_mentor_email ?? '—',
  }))

  const auditRows = ((auditRes.data ?? []) as AuditEntry[]).map(e => ({
    Timestamp: formatTs(e.created_at),
    Actor: e.actor_email ?? '—',
    Action: e.action,
    Item: e.item_name ?? '—',
    'Qty Change': e.quantity_change ?? '',
    Type: e.action_type,
  }))

  const inventoryRows = ((inventoryRes.data ?? []) as InventoryItemRow[]).map(i => ({
    Name: i.name,
    SKU: i.sku ?? '—',
    Quantity: i.quantity,
    'Reorder Threshold': i.reorder_threshold ?? '—',
    Supplier: i.supplier ?? '—',
    'Unit Price': i.unit_price ?? '—',
    Status: i.status ?? '—',
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), 'Issue Requests')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serviceRows), 'Service Requests')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), 'Audit Log')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), 'Inventory Items')

  XLSX.writeFile(wb, `stockpilot-report-${fromDate}-to-${toDate}.xlsx`)

  return {
    issueCount: issueRows.length,
    serviceCount: serviceRows.length,
    auditCount: auditRows.length,
    inventoryCount: inventoryRows.length,
  }
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

function AuditBadge({ type }: { type: ActionType }) {
  const clsMap: Partial<Record<ActionType, string>> = {
    CREATE:       'text-green-400 bg-green-400/10 border-green-400/20',
    UPDATE:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
    DELETE:       'text-red-400 bg-red-400/10 border-red-400/20',
    admin_action: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  }
  const cls = clsMap[type] ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider ${cls}`}>
      {type}
    </span>
  )
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

const SECTION_TABS: { key: Section; label: string; icon: typeof Shield }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Shield },
  { key: 'pending', label: 'Pending Requests', icon: Clock },
  { key: 'allreqs', label: 'All Requests', icon: ClipboardList },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
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

export default function SuperAdminDashboard() {
  const { user, userRole } = useAuth()
  const queryClient = useQueryClient()

  const [section, setSection] = useState<Section>('dashboard')

  // Stats
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingRequests: 0, totalItems: 0, activeMentors: 0, avgProcessingHours: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  // Pending / All Requests tabs (equipment vs service)
  const [pendingTab, setPendingTab] = useState<RequestTypeTab>('equipment')
  const [allReqTab, setAllReqTab] = useState<RequestTypeTab>('equipment')
  const [allFilter, setAllFilter] = useState<AllRequestsFilter>('All')
  const [rowActionId, setRowActionId] = useState<string | null>(null)

  // Mentors (for assign dropdown)
  const { mentors, refetchMentors } = useMentors()

  // Users
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Approve modal (mentor assignment) — return deadline is now set by the
  // mentor themselves once they hand the item over, not chosen here.
  const [approveTarget, setApproveTarget] = useState<IssueRequest | null>(null)
  const [approveMentorEmail, setApproveMentorEmail] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)
  const [submittedGmail, setSubmittedGmail] = useState<GmailComposeParams | null>(null)

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<IssueRequest | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // Reassign mentor modal (equipment requests already approved)
  const [reassignTarget, setReassignTarget] = useState<IssueRequest | null>(null)
  const [reassignMentorEmail, setReassignMentorEmail] = useState('')
  const [reassignLoading, setReassignLoading] = useState(false)

  // Audit log
  const [auditTab, setAuditTab] = useState<AuditTab>('recent')
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportingRange, setExportingRange] = useState(false)
  const [archiveCutoff, setArchiveCutoff] = useState('')
  const [archiving, setArchiving] = useState(false)

  const initRef = useRef(false)

  // ── Fetch equipment issue requests (shared by Pending + All Requests) ─────────

  const { data: issueData, isLoading: issueLoading } = useQuery({
    queryKey: ['sa-issue-requests'],
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
  const issueRequests = issueData ?? []
  const pendingIssueRequests = issueRequests.filter(r => r.status === 'pending')

  // ── Fetch service requests for the Analytics tab (equipment reuses issueRequests above) ──

  const { data: analyticsServiceData } = useQuery({
    queryKey: ['sa-service-requests-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, machine_name, status, created_at, updated_at')
      if (error) throw error
      return (data ?? []) as { id: string; machine_name: string; status: IssueStatus; created_at: string; updated_at: string }[]
    },
    enabled: section === 'analytics',
  })
  const analyticsServiceRequests = analyticsServiceData ?? []

  // ── Utilization analytics: top items, approval rate, avg turnaround ──────────

  const analytics = useMemo(() => {
    const topItemCounts = new Map<string, number>()
    for (const r of issueRequests) {
      topItemCounts.set(r.item_name, (topItemCounts.get(r.item_name) ?? 0) + 1)
    }
    const topItems = [...topItemCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const approvalRate = (rows: { status: IssueStatus }[]) => {
      const decided = rows.filter(r => r.status === 'approved' || r.status === 'rejected')
      if (decided.length === 0) return null
      return (decided.filter(r => r.status === 'approved').length / decided.length) * 100
    }

    const avgTurnaroundHours = (rows: { created_at: string; issued_at?: string | null; updated_at?: string; status?: string }[]) => {
      const durations: number[] = []
      for (const r of rows) {
        const end = r.issued_at ?? (r.status === 'approved' ? r.updated_at : undefined)
        if (!end) continue
        durations.push((new Date(end).getTime() - new Date(r.created_at).getTime()) / 3_600_000)
      }
      if (durations.length === 0) return null
      return durations.reduce((sum, d) => sum + d, 0) / durations.length
    }

    return {
      topItems,
      equipmentApprovalRate: approvalRate(issueRequests),
      serviceApprovalRate: approvalRate(analyticsServiceRequests),
      equipmentAvgTurnaroundHours: avgTurnaroundHours(issueRequests),
      serviceAvgTurnaroundHours: avgTurnaroundHours(analyticsServiceRequests),
    }
  }, [issueRequests, analyticsServiceRequests])

  // ── Fetch stats ───────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const [usersRes, pendingEquipRes, pendingServiceRes, itemsRes, mentorsRes, approvedRes] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }),
        supabase.from('issue_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'mentor'),
        supabase.from('issue_requests').select('created_at, issued_at').eq('status', 'approved').not('issued_at', 'is', null),
      ])
      let avgProcessingHours = 0
      const approvedRows = (approvedRes.data ?? []) as { created_at: string; issued_at: string }[]
      if (approvedRows.length > 0) {
        const totalMs = approvedRows.reduce(
          (sum, r) => sum + (new Date(r.issued_at).getTime() - new Date(r.created_at).getTime()),
          0,
        )
        avgProcessingHours = totalMs / approvedRows.length / 3_600_000
      }
      setStats({
        totalUsers: usersRes.count ?? 0,
        pendingRequests: (pendingEquipRes.count ?? 0) + (pendingServiceRes.count ?? 0),
        totalItems: itemsRes.count ?? 0,
        activeMentors: mentorsRes.count ?? 0,
        avgProcessingHours,
      })
    } catch {
      // keep zero defaults
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Fetch users ───────────────────────────────────────────────────────────────

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

  // ── Fetch audit log (recent 30) ───────────────────────────────────────────────

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      if (!error) setAuditLog((data ?? []) as AuditEntry[])
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    fetchStats()
    fetchUsers()
    fetchAuditLog()
  }, [fetchStats, fetchUsers, fetchAuditLog])

  // ── Audit log insert helper ──────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string, actionType: ActionType, extra?: Record<string, unknown>) => {
    try {
      await supabase
        .from('audit_log')
        .insert({ actor_email: getAdminEmail(user?.email), action, action_type: actionType, ...extra })
    } catch {
      // audit failures are non-fatal
    }
  }, [user])

  // ── Approve (with mentor assignment) ─────────────────────────────────────────

  const closeApprove = () => {
    setApproveTarget(null)
    setApproveMentorEmail('')
    setApproveNote('')
    setSubmittedGmail(null)
  }

  // Step 1: validate the form and build the Gmail draft, but touch nothing in
  // the database yet — the request stays 'pending' until handleFinalizeApproval
  // runs, which only happens once the admin explicitly confirms they sent the
  // email. This avoids the request silently becoming "approved" in the system
  // if the admin closes the Gmail tab mid-draft without actually sending it.
  const handlePrepareApproval = () => {
    if (!approveTarget || !approveMentorEmail) return
    // Legacy requests submitted before professor_email was captured have
    // nothing to wait on — approve immediately, same as the old behavior.
    if (!approveTarget.professor_email) {
      void handleFinalizeApproval()
      return
    }
    const ccAddresses = [approveTarget.professor_email, approveMentorEmail]
      .filter((e): e is string => !!e?.trim())
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .join(',')
    setSubmittedGmail({
      to: approveTarget.student_email,
      cc: ccAddresses,
      subject: `IdeaLab Request Approved — ${approveTarget.item_name}`,
      body: [
        `Hi ${approveTarget.student_name},`,
        `Your request for ${approveTarget.item_name} x${approveTarget.quantity_requested} has been approved.`,
        `Assigned mentor: ${approveMentorEmail}`,
        `Your mentor will confirm the return deadline with you when handing the item over.`,
        approveNote.trim() ? `Note: ${approveNote.trim()}` : null,
        `— OPJU IdeaLab Team`,
      ].filter((l): l is string => l !== null).join('\n\n'),
    })
  }

  // Step 2: the actual database write — only reached via the "I've sent it"
  // confirmation button in the Gmail-draft modal (or directly from step 1
  // for legacy requests with no professor_email to wait on).
  const handleFinalizeApproval = async () => {
    if (!approveTarget || approveLoading) return
    setApproveLoading(true)
    try {
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

      const { error: invUpdateErr } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', approveTarget.item_id)
      if (invUpdateErr) {
        toast.error('Failed to update stock. Approval cancelled.')
        return
      }

      const { error: updateErr } = await supabase
        .from('issue_requests')
        .update({
          status: 'approved',
          issued_at: new Date().toISOString(),
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
        body: `Your request for ${approveTarget.item_name} x${approveTarget.quantity_requested} has been approved. Your mentor will confirm the return deadline when handing it over.`,
        createdByEmail: user?.email ?? 'unknown-admin',
      })

      setSubmittedGmail(null)
      closeApprove()
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void fetchStats()
      void fetchAuditLog()
    } catch {
      toast.error('Failed to approve request')
    } finally {
      setApproveLoading(false)
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectTarget || !rejectNote.trim() || rejectLoading) return
    setRejectLoading(true)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({ status: 'rejected', review_note: rejectNote.trim(), reviewed_by: user?.id ?? null })
        .eq('id', rejectTarget.id)
      if (error) throw error

      await logAudit(
        `Rejected request for ${rejectTarget.item_name} by ${rejectTarget.student_email}`,
        'admin_action',
        { item_id: rejectTarget.item_id, item_name: rejectTarget.item_name, quantity_change: 0 },
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
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void fetchStats()
      void fetchAuditLog()
    } catch {
      toast.error('Failed to reject request')
    } finally {
      setRejectLoading(false)
    }
  }

  // ── Reassign mentor (equipment) ───────────────────────────────────────────────
  // Updates only assigned_mentor_email — never touches status or physical_status,
  // so this is safe to call even after the original mentor has issued the item.

  const handleReassignMentor = async () => {
    if (!reassignTarget || !reassignMentorEmail || reassignLoading) return
    setReassignLoading(true)
    try {
      const { error } = await supabase
        .from('issue_requests')
        .update({ assigned_mentor_email: reassignMentorEmail })
        .eq('id', reassignTarget.id)
      if (error) throw error

      await logAudit(
        `Reassigned mentor for ${reassignTarget.item_name} (${reassignTarget.student_name}) from ${reassignTarget.assigned_mentor_email ?? 'none'} to ${reassignMentorEmail}`,
        'admin_action',
      )

      toast.success('Mentor reassigned')
      setReassignTarget(null)
      setReassignMentorEmail('')
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void fetchAuditLog()
    } catch {
      toast.error('Failed to reassign mentor')
    } finally {
      setReassignLoading(false)
    }
  }

  // ── Mark Issued / Returned (All Requests, equipment) ─────────────────────────

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
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void fetchAuditLog()
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
      toast.success('Item returned, inventory updated')
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void fetchAuditLog()
    } catch {
      toast.error('Failed to mark as returned')
    } finally {
      setRowActionId(null)
    }
  }

  // ── User management actions ──────────────────────────────────────────────────

  const handleGrantFaculty = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'faculty' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} granted faculty access`)
      await fetchUsers(); await fetchStats(); await refetchMentors()
      await logAudit(`Granted faculty access to ${row.email}`, 'UPDATE')
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleGrantMentor = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'mentor' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} granted mentor access`)
      await fetchUsers(); await fetchStats(); await refetchMentors()
      await logAudit(`Granted mentor access to ${row.email}`, 'UPDATE')
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
      await fetchUsers(); await fetchStats(); await refetchMentors()
      await logAudit(`Revoked faculty access from ${row.email}`, 'UPDATE')
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRevokeMentor = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase.from('user_roles').update({ role: 'student' }).eq('email', row.email)
      if (error) { toast.error(error.message); return }
      toast.success(`${row.email} revoked to student`)
      await fetchUsers(); await fetchStats(); await refetchMentors()
      await logAudit(`Revoked mentor access from ${row.email}`, 'UPDATE')
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

  const handleAddFaculty = async () => {
    if (!addEmail.trim() || addSubmitting) return
    setAddSubmitting(true)
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('email', addEmail.trim())
        .maybeSingle()
      if (fetchErr && (fetchErr as { code?: string }).code !== 'PGRST116') {
        throw new Error(fetchErr.message)
      }
      if (existing) {
        const { error } = await supabase.from('user_roles').update({ role: 'faculty' }).eq('email', addEmail.trim())
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('user_roles').insert({ email: addEmail.trim(), role: 'faculty' })
        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes('foreign key') || msg.includes('violates')) {
            toast.error('User must sign up first before being granted faculty access')
            return
          }
          throw new Error(error.message)
        }
      }
      toast.success(`${addEmail.trim()} granted faculty access`)
      await logAudit(`Added faculty by email: ${addEmail.trim()}`, 'CREATE')
      setAddEmail('')
      setShowAddModal(false)
      await fetchUsers(); await fetchStats()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add faculty'
      if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('violates')) {
        toast.error('User must sign up first before being granted faculty access')
      } else {
        toast.error(msg)
      }
    } finally {
      setAddSubmitting(false)
    }
  }

  // ── Export full audit log as XLSX ────────────────────────────────────────────

  const handleExportFullDb = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const rows = ((data ?? []) as AuditEntry[]).map(e => ({
        Timestamp: formatTs(e.created_at),
        Actor: e.actor_email ?? '—',
        Action: e.action,
        Item: e.item_name ?? '—',
        'Qty Change': e.quantity_change ?? '',
        Type: e.action_type,
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Log')
      XLSX.writeFile(wb, `audit-log-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success(`Exported ${rows.length} audit log entries`)
    } catch {
      toast.error('Failed to export audit log')
    } finally {
      setExporting(false)
    }
  }

  // ── Export custom date-range report as multi-sheet XLSX ─────────────────────

  const handleExportCustomRange = async () => {
    if (!exportFrom || !exportTo) {
      toast.error('Please select both a start and end date')
      return
    }
    if (exportFrom > exportTo) {
      toast.error('Start date must be before end date')
      return
    }
    if (exportingRange) return
    setExportingRange(true)
    try {
      const rangeEnd = `${exportTo}T23:59:59.999Z`

      const [auditRes, issueRes, serviceRes, inventoryRes] = await Promise.all([
        supabase
          .from('audit_log')
          .select('*')
          .gte('created_at', exportFrom)
          .lte('created_at', rangeEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('issue_requests')
          .select('*')
          .gte('created_at', exportFrom)
          .lte('created_at', rangeEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('service_requests')
          .select('*')
          .gte('created_at', exportFrom)
          .lte('created_at', rangeEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory_items')
          .select('*'),
      ])

      if (auditRes.error) throw auditRes.error
      if (issueRes.error) throw issueRes.error
      if (serviceRes.error) throw serviceRes.error
      if (inventoryRes.error) throw inventoryRes.error

      const auditRows = ((auditRes.data ?? []) as AuditEntry[]).map(e => ({
        Timestamp: formatTs(e.created_at),
        Actor: e.actor_email ?? '—',
        Action: e.action,
        Item: e.item_name ?? '—',
        'Qty Change': e.quantity_change ?? '',
        Type: e.action_type,
      }))

      const issueRows = ((issueRes.data ?? []) as IssueRequest[]).map(r => ({
        Timestamp: formatTs(r.created_at),
        Student: r.student_name,
        Email: r.student_email,
        Item: r.item_name,
        Qty: r.quantity_requested,
        Purpose: r.purpose,
        Status: r.status,
        'Reviewed By': r.reviewed_by ?? '—',
        Note: r.review_note ?? '—',
        'Return Deadline': r.return_deadline ?? '—',
      }))

      const serviceRows = ((serviceRes.data ?? []) as ServiceRequest[]).map(r => ({
        Timestamp: formatTs(r.created_at),
        Student: r.student_name,
        Email: r.student_email,
        Machine: r.machine_name,
        Material: r.material_type ?? '—',
        Copies: r.copies,
        Purpose: r.purpose,
        Status: r.status,
        'Assigned Slot': r.assigned_slot ? formatTs(r.assigned_slot) : '—',
        'Assigned Mentor': r.assigned_mentor_email ?? '—',
        Note: r.review_note ?? '—',
      }))

      const inventoryRows = ((inventoryRes.data ?? []) as InventoryItemRow[]).map(i => ({
        Name: i.name,
        SKU: i.sku ?? '—',
        Quantity: i.quantity,
        'Reorder Threshold': i.reorder_threshold ?? '—',
        Supplier: i.supplier ?? '—',
        'Unit Price': i.unit_price ?? '—',
        Status: i.status ?? '—',
      }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), 'Audit Log')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), 'Issue Requests')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serviceRows), 'Service Requests')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), 'Inventory Snapshot')
      XLSX.writeFile(wb, `stockpilot-report-${exportFrom}-to-${exportTo}.xlsx`)

      toast.success(`Exported ${auditRows.length} audit entries, ${issueRows.length} equipment + ${serviceRows.length} service requests, ${inventoryRows.length} inventory items`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingRange(false)
    }
  }

  // ── Semester archive/rollover ─────────────────────────────────────────────────
  // Soft-archives (never deletes) closed requests older than the cutoff, so they
  // drop out of Pending/All Requests but stay fully queryable via exports.

  const handleArchiveOldRequests = async () => {
    if (!archiveCutoff || archiving) return
    setArchiving(true)
    try {
      const cutoffIso = `${archiveCutoff}T00:00:00.000Z`
      const archivedAt = new Date().toISOString()

      const { error: issueErr, count: issueCount } = await supabase
        .from('issue_requests')
        .update({ archived_at: archivedAt }, { count: 'exact' })
        .is('archived_at', null)
        .lt('created_at', cutoffIso)
        .or('status.eq.rejected,physical_status.in.(returned,consumed)')
      if (issueErr) throw issueErr

      const { error: serviceErr, count: serviceCount } = await supabase
        .from('service_requests')
        .update({ archived_at: archivedAt }, { count: 'exact' })
        .is('archived_at', null)
        .lt('created_at', cutoffIso)
        .in('status', ['approved', 'rejected'])
      if (serviceErr) throw serviceErr

      await logAudit(
        `Archived ${issueCount ?? 0} equipment + ${serviceCount ?? 0} service requests created before ${archiveCutoff}`,
        'admin_action',
      )

      toast.success(`Archived ${issueCount ?? 0} equipment and ${serviceCount ?? 0} service requests`)
      setArchiveCutoff('')
      void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['service_requests'] })
      void fetchAuditLog()
    } catch {
      toast.error('Failed to archive requests')
    } finally {
      setArchiving(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const q = userSearch.trim().toLowerCase()
  const filteredUsers = q
    ? users.filter(u => u.email.toLowerCase().includes(q) || (u.display_name?.toLowerCase() ?? '').includes(q))
    : users

  const filteredAllRequests = issueRequests.filter(r => {
    if (r.archived_at) return false
    if (allFilter === 'All') return true
    return r.status === allFilter.toLowerCase()
  })

  const avgLabel =
    stats.avgProcessingHours === 0
      ? '—'
      : stats.avgProcessingHours >= 24
        ? `${(stats.avgProcessingHours / 24).toFixed(1)}d`
        : `${stats.avgProcessingHours.toFixed(1)}h`

  const statCards: {
    label: string; value: string | number; icon: typeof Users
    cls: string; bgCls: string; iconCls: string; dotCls: string
  }[] = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, cls: 'text-orange-300', bgCls: 'bg-orange-400/10', iconCls: 'text-orange-300', dotCls: 'bg-orange-300' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: Clock, cls: 'text-yellow-400', bgCls: 'bg-yellow-400/10', iconCls: 'text-yellow-400', dotCls: 'bg-yellow-400' },
    { label: 'Total Items', value: stats.totalItems, icon: Package, cls: 'text-blue-400', bgCls: 'bg-blue-400/10', iconCls: 'text-blue-400', dotCls: 'bg-blue-400' },
    { label: 'Active Mentors', value: stats.activeMentors, icon: GraduationCap, cls: 'text-green-400', bgCls: 'bg-green-400/10', iconCls: 'text-green-400', dotCls: 'bg-green-400' },
    { label: 'Avg Approval Time', value: avgLabel, icon: Timer, cls: 'text-violet-300', bgCls: 'bg-violet-400/10', iconCls: 'text-violet-300', dotCls: 'bg-violet-300' },
  ]

  const handleRefresh = () => {
    fetchStats(); fetchUsers(); refetchMentors(); fetchAuditLog()
    void queryClient.invalidateQueries({ queryKey: ['sa-issue-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['service_requests'] })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Super Admin — IdeaLab">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.12] px-3 py-1.5 text-xs font-semibold text-orange-300">
              <Shield className="h-3.5 w-3.5" />
              Super Admin — OPJU IdeaLab
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">
              {SECTION_TABS.find(s => s.key === section)?.label ?? 'Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Overview of IdeaLab inventory, requests, and user activity
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <SectionNav active={section} onChange={setSection} />

        {/* ════ DASHBOARD ════ */}
        {section === 'dashboard' && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
              {statCards.map(({ label, value, icon: Icon, dotCls, bgCls, iconCls, cls }) => (
                <div key={label} className="rounded-[13px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">{label}</span>
                    <div className={`rounded-lg p-1.5 ${bgCls}`}>
                      <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
                    </div>
                  </div>
                  <div className={`text-[26px] font-extrabold tabular-nums leading-none ${cls}`}>
                    {statsLoading ? '—' : value}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#6e6e78]">
                    <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Requests</h2>
                  {pendingIssueRequests.length > 0 && (
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                      {pendingIssueRequests.length} pending
                    </span>
                  )}
                </div>
                <button onClick={() => setSection('allreqs')} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]">
                  View All
                </button>
              </div>
              {issueLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                </div>
              ) : issueRequests.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        {['Student', 'Item', 'Qty', 'Status', 'Submitted'].map(h => (
                          <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {issueRequests.slice(0, 5).map(req => (
                        <tr key={req.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-2 first:pl-0">
                            <div className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{req.student_name}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                          </td>
                          <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                          <td className="py-3 px-2"><IssueStatusBadge status={req.status} /></td>
                          <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════ PENDING REQUESTS ════ */}
        {section === 'pending' && (
          <>
            <RequestTypeTabs active={pendingTab} onChange={setPendingTab} />

            {pendingTab === 'equipment' && (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pending Equipment Requests</h2>
                  {pendingIssueRequests.length > 0 && (
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                      {pendingIssueRequests.length}
                    </span>
                  )}
                </div>
                {issueLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  </div>
                ) : pendingIssueRequests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No pending requests — all clear!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                          {['Student', 'Item', 'Qty', 'Professor Email', 'Reason', 'Estimate', 'Type', 'Submitted', 'Actions'].map(h => (
                            <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {pendingIssueRequests.map(req => (
                          <tr key={req.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="py-3 px-2 first:pl-0">
                              <div className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{req.student_name}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-[#6e6e78]">{req.student_email}</div>
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-[#f4f4f6]">{req.item_name}</td>
                            <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6]">{req.quantity_requested}</td>
                            <td className="py-3 px-2 font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">—</td>
                            <td className="py-3 px-2 max-w-[160px] truncate text-gray-500 dark:text-[#9a9aa6]">{req.purpose}</td>
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
                            <td className="py-3 px-2"><span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">Equipment</span></td>
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

            {pendingTab === 'service' && (
              <ServiceRequestsPanel
                title="Pending Service Requests"
                onlyPending
                emptyMessage="No pending service requests — all clear!"
                canAssignMentor
              />
            )}
          </>
        )}

        {/* ════ ALL REQUESTS ════ */}
        {section === 'allreqs' && (
          <>
            <RequestTypeTabs active={allReqTab} onChange={setAllReqTab} />

            {allReqTab === 'equipment' && (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
                <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Equipment Requests</h2>
                  <div className="flex items-center gap-1.5">
                    {(['All', 'Pending', 'Approved', 'Rejected'] as AllRequestsFilter[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setAllFilter(f)}
                        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                          allFilter === f
                            ? 'border-transparent bg-[#f97316] text-white'
                            : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {issueLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  </div>
                ) : filteredAllRequests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No {allFilter.toLowerCase()} requests.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                          {['Student', 'Item', 'Qty', 'Status', 'Mentor', 'Team', 'Submitted', 'Return By', 'Physical Status', 'Action'].map(h => (
                            <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {filteredAllRequests.map(req => {
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
                              <td className="py-3 px-2 font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">
                                <div>{req.assigned_mentor_email ?? '—'}</div>
                                {req.status === 'approved' && (
                                  <button
                                    onClick={() => { setReassignTarget(req); setReassignMentorEmail(req.assigned_mentor_email ?? '') }}
                                    className="cursor-pointer font-sans text-[10px] font-semibold text-orange-400 hover:text-orange-300"
                                  >
                                    Reassign
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-2 max-w-[160px]"><TeamMembersBadgeList members={req.team_members} /></td>
                              <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                              <td className="py-3 px-2 text-gray-500 dark:text-[#6e6e78] whitespace-nowrap">{req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : '—'}</td>
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
                )}
              </div>
            )}

            {allReqTab === 'service' && (
              <ServiceRequestsPanel
                title="All Service Requests"
                onlyPending={false}
                emptyMessage="No service requests found."
                canAssignMentor
              />
            )}
          </>
        )}

        {/* ════ ANALYTICS ════ */}
        {section === 'analytics' && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Equipment Approval Rate', value: analytics.equipmentApprovalRate, suffix: '%', icon: TrendingUp },
                { label: 'Service Approval Rate', value: analytics.serviceApprovalRate, suffix: '%', icon: TrendingUp },
                { label: 'Avg Equipment Turnaround', value: analytics.equipmentAvgTurnaroundHours, suffix: 'h', icon: Timer },
                { label: 'Avg Service Turnaround', value: analytics.serviceAvgTurnaroundHours, suffix: 'h', icon: Timer },
              ].map(({ label, value, suffix, icon: Icon }) => (
                <div key={label} className="rounded-[13px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">{label}</span>
                    <div className="rounded-lg bg-orange-400/10 p-1.5">
                      <Icon className="h-3.5 w-3.5 text-orange-300" />
                    </div>
                  </div>
                  <div className="text-[26px] font-extrabold tabular-nums leading-none text-gray-900 dark:text-white">
                    {value == null ? '—' : `${value.toFixed(1)}${suffix}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
              <h2 className="mb-5 text-sm font-bold text-gray-900 dark:text-white">Most Requested Items</h2>
              {analytics.topItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No equipment requests yet.</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topItems} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#6e6e78" fontSize={11} tickLine={false} axisLine={false} width={140} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1108', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                      />
                      <Bar dataKey="count" name="Requests" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════ USER MANAGEMENT ════ */}
        {section === 'users' && (
          <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">User Management</h2>
                {!usersLoading && !usersError && (
                  <span className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-[#6e6e78]">
                    {users.length} account{users.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-px"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Faculty by Email
              </button>
            </div>

            {!usersLoading && !usersError && users.length > 0 && (
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-[10px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] py-2 pl-8 pr-3 text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400/60 focus:bg-white focus:dark:bg-white/[0.05]"
                />
              </div>
            )}

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
                            {role === 'admin' || role === 'super_admin' ? (
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
                                <button onClick={() => handleGrantMentor(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-blue-400/30 bg-blue-400/[0.08] px-3 py-1.5 text-[12px] font-semibold text-blue-400 transition hover:bg-blue-400/[0.16] disabled:opacity-50">
                                  {busy && <span className="h-3 w-3 animate-spin rounded-full border border-blue-400 border-t-transparent" />}
                                  Grant Mentor
                                </button>
                                <button onClick={() => handleBanUser(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50">
                                  {busy && <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />}
                                  Ban
                                </button>
                              </div>
                            ) : role === 'mentor' ? (
                              <button onClick={() => handleRevokeMentor(row)} disabled={busy} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50">
                                {busy && <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />}
                                Revoke Mentor
                              </button>
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
        )}

        {/* ════ AUDIT LOG ════ */}
        {section === 'audit' && (
          <>
            <div className="mb-6 flex items-center gap-1.5">
              <button
                onClick={() => setAuditTab('recent')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold transition-all ${
                  auditTab === 'recent'
                    ? 'border-transparent bg-[#f97316] text-white'
                    : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Recent (last 30)
              </button>
              {userRole === 'super_admin' && (
                <button
                  onClick={() => setAuditTab('export')}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold transition-all ${
                    auditTab === 'export'
                      ? 'border-transparent bg-[#f97316] text-white'
                      : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Full DB
                </button>
              )}
            </div>

            {auditTab === 'recent' && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Audit Log</h2>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-[#6e6e78]">Last 30 entries</span>
                </div>
                {auditLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No audit entries yet.</p>
                ) : (
                  <div>
                    <div className="hidden md:flex items-center gap-3 border-b border-gray-100 dark:border-white/[0.06] pb-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-[#6e6e78]">
                      <span className="w-36 shrink-0">Timestamp</span>
                      <span className="w-36 shrink-0">Actor</span>
                      <span className="flex-1">Action</span>
                      <span className="w-32 shrink-0">Item</span>
                      <span className="w-16 shrink-0 text-right">Qty Δ</span>
                      <span className="w-24 shrink-0 text-right">Type</span>
                    </div>
                    {auditLog.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3 border-b border-gray-100 dark:border-white/[0.06] py-3 last:border-0">
                        <span className="w-36 shrink-0 pt-px font-mono text-[10px] leading-tight text-gray-400 dark:text-[#4b4b57]">{formatTs(entry.created_at)}</span>
                        <span className="w-36 shrink-0 truncate text-[12px] font-medium text-gray-500 dark:text-[#9a9aa6]">{entry.actor_email ?? '—'}</span>
                        <span className="flex-1 text-[12px] text-gray-900 dark:text-[#f4f4f6]">{entry.action}</span>
                        <span className="w-32 shrink-0 truncate text-[12px] text-gray-500 dark:text-[#9a9aa6]">{entry.item_name ?? '—'}</span>
                        <span className="w-16 shrink-0 pt-px text-right text-[11px]">
                          {entry.quantity_change != null ? (
                            <span className={entry.quantity_change < 0 ? 'font-semibold text-red-400' : 'font-semibold text-green-400'}>
                              {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                            </span>
                          ) : '—'}
                        </span>
                        <span className="w-24 shrink-0 text-right"><AuditBadge type={entry.action_type} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {auditTab === 'export' && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-12 text-center">
                <div className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-[13px] border border-orange-400/20 bg-orange-400/10 text-orange-400">
                  <Download className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-bold text-gray-900 dark:text-white">Export Full Database</h3>
                <p className="mx-auto mb-6 max-w-[360px] text-[13px] text-gray-500 dark:text-[#9a9aa6]">
                  Download the complete audit log as an XLSX file. Includes all actions, timestamps, actors, and items.
                </p>
                <button
                  onClick={() => void handleExportFullDb()}
                  disabled={exporting}
                  className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {exporting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download Audit Log XLSX
                </button>
                <p className="mt-3 text-[11.5px] text-gray-400 dark:text-[#6e6e78]">Full database export · All time · Super Admin only</p>
              </div>
            )}

            {auditTab === 'export' && (
              <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-12 text-center">
                <div className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-[13px] border border-orange-400/20 bg-orange-400/10 text-orange-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-bold text-gray-900 dark:text-white">Custom Date Range Export</h3>
                <p className="mx-auto mb-6 max-w-[380px] text-[13px] text-gray-500 dark:text-[#9a9aa6]">
                  Download audit log, issue requests, and a current inventory snapshot for a specific date range.
                </p>

                <div className="mx-auto mb-6 flex max-w-[360px] items-end gap-3">
                  <div className="flex-1 text-left">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">From</label>
                    <input
                      type="date"
                      value={exportFrom}
                      onChange={e => setExportFrom(e.target.value)}
                      className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-2.5 text-[13px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">To</label>
                    <input
                      type="date"
                      value={exportTo}
                      onChange={e => setExportTo(e.target.value)}
                      className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-2.5 text-[13px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                    />
                  </div>
                </div>

                <button
                  onClick={() => void handleExportCustomRange()}
                  disabled={exportingRange}
                  className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {exportingRange ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {exportingRange ? 'Exporting…' : 'Download Range Report'}
                </button>

                <p className="mt-3 text-[11.5px] text-gray-400 dark:text-[#6e6e78]">Custom date range · Audit Log + Issue Requests + Inventory Snapshot</p>
              </div>
            )}

            {auditTab === 'export' && (
              <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-12 text-center">
                <div className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-[13px] border border-orange-400/20 bg-orange-400/10 text-orange-400">
                  <Archive className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-bold text-gray-900 dark:text-white">Semester Archive / Rollover</h3>
                <p className="mx-auto mb-6 max-w-[400px] text-[13px] text-gray-500 dark:text-[#9a9aa6]">
                  Soft-archives closed requests (returned/consumed equipment, rejected requests, and decided service requests) submitted before the cutoff date. They drop out of Pending / All Requests but stay fully queryable via exports — nothing is deleted.
                </p>

                <div className="mx-auto mb-6 max-w-[280px] text-left">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">Archive requests created before</label>
                  <input
                    type="date"
                    value={archiveCutoff}
                    onChange={e => setArchiveCutoff(e.target.value)}
                    className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-2.5 text-[13px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400"
                  />
                </div>

                <button
                  onClick={() => void handleArchiveOldRequests()}
                  disabled={!archiveCutoff || archiving}
                  className="mx-auto inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-50"
                >
                  {archiving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {archiving ? 'Archiving…' : 'Archive Closed Requests'}
                </button>

                <p className="mt-3 text-[11.5px] text-gray-400 dark:text-[#6e6e78]">Reversible in the database · Super Admin only</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Approve & Assign Mentor Modal ── */}
      {approveTarget && !submittedGmail && (
        <Modal onClose={closeApprove}>
          <div className="w-full max-w-[460px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Approve &amp; Assign Mentor</h2>
              <button onClick={closeApprove} className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
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
                Note <span className="font-normal text-gray-400 dark:text-[#6e6e78]">(optional)</span>
              </label>
              <textarea
                value={approveNote}
                onChange={e => setApproveNote(e.target.value)}
                placeholder="Any notes for the student or mentor…"
                rows={2}
                className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400"
              />
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-[#6e6e78]">
                The return deadline is set by the assigned mentor once they hand the item over, not here.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closeApprove} className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                Cancel
              </button>
              <button
                onClick={handlePrepareApproval}
                disabled={!approveMentorEmail || approveLoading}
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
        <Modal onClose={() => { setRejectTarget(null); setRejectNote('') }}>
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Reject Request</h2>
              <button onClick={() => { setRejectTarget(null); setRejectNote('') }} className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
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
                className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectNote('') }} className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]">
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
              <button onClick={() => { setReassignTarget(null); setReassignMentorEmail('') }} className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              <span className="font-semibold text-gray-900 dark:text-[#f4f4f6]">{reassignTarget.student_name}</span>
              {' '}·{' '}{reassignTarget.item_name}
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
              <button onClick={() => { setReassignTarget(null); setReassignMentorEmail('') }} className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                Cancel
              </button>
              <button
                onClick={() => void handleReassignMentor()}
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

      {/* ── Add Faculty Modal ── */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); setAddEmail('') }}>
          <div className="w-full max-w-[420px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Add Faculty by Email</h2>
              <button onClick={() => { setShowAddModal(false); setAddEmail('') }} className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500 dark:text-[#9a9aa6]">
              Grant faculty access to a user by their email. If the user doesn't exist yet, they must sign up first.
            </p>
            <div className="mb-5">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                Email address <span className="text-orange-400 dark:text-orange-300">*</span>
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleAddFaculty() }}
                placeholder="faculty@opju.ac.in"
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowAddModal(false); setAddEmail('') }} className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                Cancel
              </button>
              <button
                onClick={() => void handleAddFaculty()}
                disabled={!addEmail.trim() || addSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {addSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Grant Faculty Access
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
    </AppShell>
  )
}
