import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action'

interface AuditEntry {
  id: string
  actor_email: string | null
  action: string
  action_type: ActionType
  created_at: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Badges ────────────────────────────────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminAuditLogPage() {
  const [auditLog, setAuditLog]     = useState<AuditEntry[]>([])
  const [auditExists, setAuditExists] = useState(true)
  const [loading, setLoading]       = useState(true)

  const initRef = useRef(false)

  // ── Fetch audit log ──────────────────────────────────────────────────────────

  const fetchAuditLog = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        if ((error as { code?: string }).code === '42P01') {
          setAuditExists(false)
        }
        return
      }
      setAuditLog((data ?? []) as AuditEntry[])
      setAuditExists(true)
    } catch {
      // silently ignore — audit log is optional
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    fetchAuditLog()
  }, [fetchAuditLog])

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
            onClick={fetchAuditLog}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07]"
          >
            Refresh
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
              <span className="text-[10px] font-medium text-gray-500 dark:text-[#6e6e78]">Last 20 entries</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : auditLog.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No audit entries yet.</p>
            ) : (
              <div>
                {auditLog.map(entry => (
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
                    <AuditBadge type={entry.action_type} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
