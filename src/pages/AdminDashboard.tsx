import { useState } from 'react'
import { Shield, Users, Activity, AlertCircle, Clock, Zap } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { toast } from 'sonner'

const mockUsers = [
  {
    name: 'Shrijan Mishra',
    email: 'shrijan@gmail.com',
    provider: 'Google',
    plan: 'Pro',
    lastActive: '2 min ago',
  },
  {
    name: 'Shrijan Mishra',
    email: 'shrijan@outlook.com',
    provider: 'Microsoft',
    plan: 'Free',
    lastActive: '1 hour ago',
  },
  {
    name: 'Admin',
    email: 'admin@stockpilot.inc',
    provider: 'Admin',
    plan: 'Admin',
    lastActive: 'Just now',
  },
]

const auditLog = [
  { ts: '2026-05-20 14:32', user: 'shrijan', action: 'Added item MacBook Pro M3 Max', type: 'CREATE' },
  { ts: '2026-05-20 14:28', user: 'shrijan', action: 'Updated QTY for Dell UltraSharp 27', type: 'UPDATE' },
  { ts: '2026-05-20 13:55', user: 'shrijan', action: 'Created PO-2024-092 — Apex Manufacturing', type: 'CREATE' },
  { ts: '2026-05-20 12:10', user: 'admin', action: 'Upgraded user shrijan@gmail.com to Pro', type: 'UPDATE' },
  { ts: '2026-05-19 18:42', user: 'shrijan', action: 'Deleted item Standing Desk 60-inch', type: 'DELETE' },
  { ts: '2026-05-19 17:30', user: 'admin', action: 'Broadcast alert sent to all users', type: 'UPDATE' },
]

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    Pro: 'bg-violet-500/20 text-violet-300',
    Free: 'bg-zinc-700 text-zinc-400',
    Admin: 'bg-red-500/20 text-red-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles[plan] ?? styles.Free}`}>
      {plan}
    </span>
  )
}

function AuditBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    CREATE: 'bg-green-500/15 text-green-400',
    UPDATE: 'bg-blue-500/15 text-blue-400',
    DELETE: 'bg-red-500/15 text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${styles[type] ?? ''}`}>
      {type}
    </span>
  )
}

export default function AdminDashboard() {
  const [broadcast, setBroadcast] = useState('')

  return (
    <AppShell title="Admin Panel">
      <div className="p-6 max-w-6xl">

        {/* Admin Badge */}
        <div className="bg-violet-900/20 border border-violet-800/40 rounded-xl px-4 py-2 text-xs text-violet-300 font-medium mb-6 inline-flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Admin access — StockPilot Inc.
        </div>

        {/* Section 1 — System Health */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Uptime', value: '99.9%', icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'API Latency', value: '<80ms', icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Active Users', value: '3', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Errors (24h)', value: '0', icon: AlertCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                <div className={`p-1.5 rounded-lg ${bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
              </div>
              <span className={`text-2xl font-bold tracking-tight ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Section 2 — User Management */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">User Management</h2>
            <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-700">
              3 accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800">
                <tr>
                  {['User', 'Email', 'Provider', 'Plan', 'Last Active', 'Actions'].map(h => (
                    <th key={h} className="pb-3 px-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-500 first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {mockUsers.map((u, i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 first:pl-0 font-semibold text-zinc-200 whitespace-nowrap">{u.name}</td>
                    <td className="py-3 px-2 text-zinc-400 whitespace-nowrap font-mono text-[10px]">{u.email}</td>
                    <td className="py-3 px-2 text-zinc-400">{u.provider}</td>
                    <td className="py-3 px-2">
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className="py-3 px-2 text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" /> {u.lastActive}
                    </td>
                    <td className="py-3 px-2">
                      {u.plan === 'Pro' && (
                        <button
                          onClick={() => toast.success(`${u.name} demoted to Free`)}
                          className="text-xs px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:border-violet-500 hover:text-violet-400 transition-colors whitespace-nowrap"
                        >
                          Demote to Free
                        </button>
                      )}
                      {u.plan === 'Free' && (
                        <button
                          onClick={() => toast.success(`${u.name} upgraded to Pro`)}
                          className="text-xs px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:border-violet-500 hover:text-violet-400 transition-colors whitespace-nowrap"
                        >
                          Upgrade to Pro
                        </button>
                      )}
                      {u.plan === 'Admin' && (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3 — Audit Log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Audit Log</h2>
            <span className="text-[10px] text-zinc-500 font-medium">Recent activity</span>
          </div>

          <div>
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                <span className="text-[10px] text-zinc-600 w-32 shrink-0 font-mono pt-px leading-tight">
                  {entry.ts}
                </span>
                <span className="text-xs text-zinc-400 w-16 shrink-0 font-medium">{entry.user}</span>
                <span className="text-xs text-zinc-300 flex-1">{entry.action}</span>
                <AuditBadge type={entry.type} />
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 — Broadcast Alert */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white">Broadcast Alert</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Send a notification banner to all users</p>
          </div>

          <textarea
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
            placeholder="Type your announcement…"
            className="bg-zinc-800 border border-zinc-700 rounded-xl w-full h-20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />

          <button
            onClick={() => {
              if (!broadcast.trim()) return
              toast.success('Alert broadcast to all users')
              setBroadcast('')
            }}
            className="mt-3 px-5 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Send Broadcast
          </button>
        </div>

      </div>
    </AppShell>
  )
}
