import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Shield, Users, Package, ShoppingCart, GraduationCap,
  Plus, X, RefreshCw, Clock, Search,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { getAdminEmail } from '../lib/adminUtils'


// ─── Types ─────────────────────────────────────────────────────────────────────

type RoleType = 'student' | 'faculty' | 'admin' | 'banned'
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action'

interface UserRow {
  user_id: string
  email: string
  role: RoleType | null
  display_name: string | null
  last_sign_in_at: string | null
}

interface Stats {
  totalUsers: number
  totalRequests: number
  totalItems: number
  activeFaculty: number
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

// ─── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: RoleType }) {
  const cls: Record<RoleType, string> = {
    student:  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    faculty:  'text-orange-300 bg-orange-300/10 border-orange-300/20',
    admin:    'text-orange-400 bg-orange-400/10 border-orange-400/20',
    banned:   'text-red-400 bg-red-400/10 border-red-400/20',
  }
  const label: Record<RoleType, string> = {
    student: 'Student',
    faculty: 'Faculty',
    admin:   'Admin',
    banned:  'Banned',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls[role]}`}>
      {label[role]}
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth()

  const [users, setUsers]           = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [stats, setStats]           = useState<Stats>({ totalUsers: 0, totalRequests: 0, totalItems: 0, activeFaculty: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addEmail, setAddEmail]     = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')



  const initRef = useRef(false)

  // ── Fetch users ──────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if ((error as { code?: string }).code === '42P01') {
          setUsersError('user_roles table not found. Run the database migration to enable this feature.')
        } else {
          setUsersError(error.message)
        }
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



  // ── Fetch stats ──────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const [usersRes, requestsRes, itemsRes, facultyRes] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }),
        supabase.from('issue_requests').select('*', { count: 'exact', head: true }),
        supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'faculty'),
      ])
      setStats({
        totalUsers:     usersRes.count    ?? 0,
        totalRequests:  requestsRes.count ?? 0,
        totalItems:     itemsRes.count    ?? 0,
        activeFaculty:  facultyRes.count  ?? 0,
      })
    } catch {
      // keep zero defaults
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    fetchUsers()
    fetchStats()
  }, [fetchUsers, fetchStats])

  // ── Audit log helper ──────────────────────────────────────────────────────────

  const logAudit = useCallback(async (action: string, actionType: ActionType) => {
    try {
      await supabase
        .from('audit_log')
        .insert({ actor_email: getAdminEmail(user?.email), action, action_type: actionType })
    } catch {
      // audit failures are non-fatal
    }
  }, [user])

  // ── Grant faculty ─────────────────────────────────────────────────────────────

  const handleGrantFaculty = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      // Always update by email — matches how AuthContext reads the role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'faculty' })
        .eq('email', row.email)

      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`${row.email} granted faculty access`)
        await fetchUsers()
        await fetchStats()
        await logAudit(`Granted faculty access to ${row.email}`, 'UPDATE')
      }
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Revoke faculty ────────────────────────────────────────────────────────────

  const handleRevokeFaculty = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      // Always update by email — matches how AuthContext reads the role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'student' })
        .eq('email', row.email)

      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`${row.email} revoked to student`)
        await fetchUsers()
        await fetchStats()
        await logAudit(`Revoked faculty access from ${row.email}`, 'UPDATE')
      }
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Ban student ───────────────────────────────────────────────────────────────

  const handleBanUser = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'banned' })
        .eq('email', row.email)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`${row.email} has been banned`)
        await fetchUsers()
        await logAudit(`Banned student ${row.email}`, 'admin_action')
      }
    } catch {
      toast.error('Failed to ban user')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Unban student ─────────────────────────────────────────────────────────────

  const handleUnbanUser = async (row: UserRow) => {
    if (updatingId) return
    setUpdatingId(row.user_id)
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'student' })
        .eq('email', row.email)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`${row.email} has been unbanned`)
        await fetchUsers()
        await logAudit(`Unbanned student ${row.email}`, 'admin_action')
      }
    } catch {
      toast.error('Failed to unban user')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Add faculty by email ──────────────────────────────────────────────────────

  const handleAddFaculty = async () => {
    if (!addEmail.trim() || addSubmitting) return
    setAddSubmitting(true)
    try {
      // Check if a row already exists for this email
      const { data: existing, error: fetchErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('email', addEmail.trim())
        .maybeSingle()

      if (fetchErr && (fetchErr as { code?: string }).code !== 'PGRST116') {
        throw new Error(fetchErr.message)
      }

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'faculty' })
          .eq('email', addEmail.trim())
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ email: addEmail.trim(), role: 'faculty' })
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
      await fetchUsers()
      await fetchStats()
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



  // ── Refresh all ───────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    fetchUsers()
    fetchStats()
  }

  // ── Stats card config ─────────────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      numCls:  'text-gray-900 dark:text-white',
      dotCls:  'bg-orange-300',
      bgCls:   'bg-orange-400/10',
      iconCls: 'text-orange-300',
    },
    {
      label: 'Total Requests',
      value: stats.totalRequests,
      icon: ShoppingCart,
      numCls:  'text-cyan-400',
      dotCls:  'bg-cyan-400',
      bgCls:   'bg-cyan-500/10',
      iconCls: 'text-cyan-400',
    },
    {
      label: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      numCls:  'text-orange-400',
      dotCls:  'bg-orange-400',
      bgCls:   'bg-orange-500/10',
      iconCls: 'text-orange-400',
    },
    {
      label: 'Active Faculty',
      value: stats.activeFaculty,
      icon: GraduationCap,
      numCls:  'text-green-400',
      dotCls:  'bg-green-400',
      bgCls:   'bg-green-500/10',
      iconCls: 'text-green-400',
    },
  ] as const

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Admin Panel">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.12] px-3 py-1.5 text-xs font-semibold text-orange-300">
              <Shield className="h-3.5 w-3.5" />
              Admin access — OPJU IdeaLab
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Manage users, view activity, and monitor system health
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

        {/* ── Stats Row ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, numCls, dotCls, bgCls, iconCls }) => (
            <div key={label} className="rounded-[13px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">
                  {label}
                </span>
                <div className={`rounded-lg p-1.5 ${bgCls}`}>
                  <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
                </div>
              </div>
              <div className={`text-[26px] font-extrabold tabular-nums leading-none ${numCls}`}>
                {statsLoading ? '—' : value}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#6e6e78]">
                <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── User Management ── */}
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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Faculty by Email
            </button>
          </div>

          {/* Search input */}
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
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-300">
              {usersError}
            </div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No users found in user_roles table.</p>
          ) : (() => {
            const q = userSearch.trim().toLowerCase()
            const filteredUsers = q
              ? users.filter(u =>
                  u.email.toLowerCase().includes(q) ||
                  (u.display_name?.toLowerCase() ?? '').includes(q)
                )
              : users
            return (
              <div className="overflow-x-auto">
                {filteredUsers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No users match "{userSearch}".</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        {['Name / Email', 'Role', 'Last Active', 'Actions'].map(h => (
                          <th
                            key={h}
                            className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {filteredUsers.map(row => {
                        const role: RoleType = (row.role as RoleType) ?? 'student'
                        return (
                          <tr key={row.user_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="py-3.5 px-2 first:pl-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-[#f4f4f6]">
                                {row.display_name || row.email.split('@')[0]}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-[11px] text-gray-500 dark:text-[#6e6e78]">{row.email}</span>
                                {role === 'banned' && (
                                  <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-400">
                                    BANNED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              <RoleBadge role={role} />
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-[#6e6e78]">
                                <Clock className="h-3 w-3 shrink-0" />
                                {timeAgo(row.last_sign_in_at)}
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              {role === 'admin' ? (
                                <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
                              ) : role === 'banned' ? (
                                <button
                                  onClick={() => handleUnbanUser(row)}
                                  disabled={updatingId === row.user_id}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-green-400/30 bg-green-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-green-400 transition hover:bg-green-400/[0.16] disabled:opacity-50"
                                >
                                  {updatingId === row.user_id && (
                                    <span className="h-3 w-3 animate-spin rounded-full border border-green-400 border-t-transparent" />
                                  )}
                                  Unban
                                </button>
                              ) : role === 'student' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleGrantFaculty(row)}
                                    disabled={updatingId === row.user_id}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/40 bg-orange-400/[0.08] px-3 py-1.5 text-[12px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50"
                                  >
                                    {updatingId === row.user_id && (
                                      <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />
                                    )}
                                    Grant Faculty
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(row)}
                                    disabled={updatingId === row.user_id}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50"
                                  >
                                    {updatingId === row.user_id && (
                                      <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
                                    )}
                                    Ban
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleRevokeFaculty(row)}
                                  disabled={updatingId === row.user_id}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50"
                                >
                                  {updatingId === row.user_id && (
                                    <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
                                  )}
                                  Revoke Faculty
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })()}
        </div>



      </div>

      {/* ── Add Faculty Modal ── */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); setAddEmail('') }}>
          <div className="w-full max-w-[420px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white">Add Faculty by Email</h2>
              <button
                onClick={() => { setShowAddModal(false); setAddEmail('') }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
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
                className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setAddEmail('') }}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddFaculty()}
                disabled={!addEmail.trim() || addSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {addSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Grant Faculty Access
              </button>
            </div>
          </div>
        </Modal>
      )}

    </AppShell>
  )
}
