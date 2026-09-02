import { useCallback, useEffect, useState } from 'react'
import { ScrollText, X } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { QtyChangeBadge } from '../components/common/QtyChangeBadge'
import { supabase } from '../lib/supabaseClient'
import type { AuditActionType, AuditLogEntry } from '../types'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function AuditBadge({ type }: { type: AuditActionType }) {
  const clsMap: Partial<Record<AuditActionType, string>> = {
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminAuditLogPage() {
  const [auditLog, setAuditLog]     = useState<AuditLogEntry[]>([])
  const [auditExists, setAuditExists] = useState(true)
  const [loading, setLoading]       = useState(true)
  const [itemFilter, setItemFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [adminOptions, setAdminOptions] = useState<string[]>([])

  // ── Fetch distinct staff emails for the admin filter dropdown ────────────────

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('email')
        .in('role', ['admin', 'super_admin', 'mentor'])
        .order('email')
      setAdminOptions((data ?? []).map(r => r.email as string))
    })()
  }, [])

  // ── Fetch audit log ──────────────────────────────────────────────────────────

  const fetchAuditLog = useCallback(async (filters: { item: string; student: string; admin: string }) => {
    setLoading(true)
    try {
      const itemQuery = filters.item.trim().replace(/[(),]/g, '')
      const studentQuery = filters.student.trim()
      const adminQuery = filters.admin

      let req = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (itemQuery) {
        req = req.or(`item_name.ilike.%${itemQuery}%,action.ilike.%${itemQuery}%`)
      }
      if (studentQuery) {
        req = req.ilike('action', `%${studentQuery}%`)
      }
      if (adminQuery) {
        req = req.eq('actor_email', adminQuery)
      }

      const hasAnyFilter = Boolean(itemQuery || studentQuery || adminQuery)
      req = req.limit(hasAnyFilter ? 50 : 30)

      const { data, error } = await req

      if (error) {
        if ((error as { code?: string }).code === '42P01') {
          setAuditExists(false)
        }
        return
      }
      setAuditLog((data ?? []) as AuditLogEntry[])
      setAuditExists(true)
    } catch {
      // silently ignore — audit log is optional
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch on mount and whenever any filter changes ────────────────────────────

  useEffect(() => {
    void Promise.resolve().then(() => fetchAuditLog({ item: itemFilter, student: studentFilter, admin: adminFilter }))
  }, [fetchAuditLog, itemFilter, studentFilter, adminFilter])

  const hasFilter = itemFilter.trim().length > 0 || studentFilter.trim().length > 0 || adminFilter.length > 0

  const clearAllFilters = () => {
    setItemFilter('')
    setStudentFilter('')
    setAdminFilter('')
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Audit Log">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/[0.12] px-3 py-1.5 text-xs font-semibold text-cyan-400">
              <ScrollText className="h-3.5 w-3.5" />
              Admin — Activity Log
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Audit Log</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Track all admin actions and system events
            </p>
          </div>
          <button
            onClick={() => fetchAuditLog({ item: itemFilter, student: studentFilter, admin: adminFilter })}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]"
          >
            Refresh
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="mb-4 flex w-full flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <input
              type="text"
              value={itemFilter}
              onChange={e => setItemFilter(e.target.value)}
              placeholder="Filter by item..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400/40"
            />
            {itemFilter && (
              <button
                onClick={() => setItemFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 dark:text-[#6e6e78] transition hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="relative min-w-[180px] flex-1">
            <input
              type="text"
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              placeholder="Filter by student email..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400/40"
            />
            {studentFilter && (
              <button
                onClick={() => setStudentFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 dark:text-[#6e6e78] transition hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="min-w-[160px] flex-1">
            <select
              value={adminFilter}
              onChange={e => setAdminFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400/40"
            >
              <option value="">All Admins</option>
              {adminOptions.map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          <button
            onClick={clearAllFilters}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-gray-400 dark:text-[#6e6e78] transition hover:text-gray-900 dark:hover:text-white"
          >
            Clear all
          </button>
        </div>

        {/* ── Audit Log ── */}
        {!auditExists ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-300">
            audit_log table not found. Run the database migration to enable this feature.
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Audit Log</h2>
              <span className="text-[10px] font-medium text-gray-500 dark:text-[#6e6e78]">
                {hasFilter ? `${auditLog.length} of 50 (last 50)` : 'Last 30 entries'}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : (
              <div>
                <div className="hidden md:flex items-center gap-3 border-b border-gray-100 dark:border-white/[0.06] pb-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-[#6e6e78]">
                  <span className="w-36 shrink-0">Timestamp</span>
                  <span className="w-36 shrink-0">Actor</span>
                  <span className="flex-1">Action</span>
                  <span className="w-32 shrink-0">Item</span>
                  <span className="w-16 shrink-0 text-right">Qty Change</span>
                  <span className="w-24 shrink-0 text-right">Type</span>
                </div>

                {auditLog.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">
                    {hasFilter ? 'No entries found for the selected filters.' : 'No audit entries yet.'}
                  </p>
                ) : (
                  auditLog.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 border-b border-gray-100 dark:border-white/[0.06] py-3 last:border-0"
                    >
                      <span className="w-36 shrink-0 pt-px font-mono text-[10px] leading-tight text-gray-400 dark:text-[#4b4b57]">
                        {formatTs(entry.created_at)}
                      </span>
                      <span className="w-36 shrink-0 truncate text-[12px] font-medium text-gray-500 dark:text-[#9a9aa6]">
                        {entry.actor_email ?? '—'}
                      </span>
                      <span className="flex-1 text-[12px] text-gray-900 dark:text-[#f4f4f6]">{entry.action}</span>
                      <span className="w-32 shrink-0 truncate text-[12px] text-gray-500 dark:text-[#9a9aa6]" title={entry.item_name ?? undefined}>
                        {entry.item_name ?? '—'}
                      </span>
                      <span className="w-16 shrink-0 pt-px text-right text-[11px]">
                        <QtyChangeBadge value={entry.quantity_change} />
                      </span>
                      <span className="w-24 shrink-0 text-right">
                        <AuditBadge type={entry.action_type} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
