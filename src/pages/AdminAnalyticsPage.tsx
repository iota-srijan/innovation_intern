import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Activity, TrendingUp, CalendarDays } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'

interface SessionRow {
  id: string
  user_id: string
  user_email: string
  user_role: string | null
  started_at: string
}

const RANGE_OPTIONS = [30, 90] as const
type RangeDays = (typeof RANGE_OPTIONS)[number]

export default function AdminAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)

  // Cookieless: analytics_sessions has one row per authenticated app load per
  // tab (see src/hooks/useSessionTracking.ts). Real-world volume for a single
  // college lab is small enough that fetching the range's raw rows and
  // aggregating client-side is simpler than a second RPC for per-user stats.
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-sessions', rangeDays],
    queryFn: async (): Promise<SessionRow[]> => {
      const from = new Date()
      from.setDate(from.getDate() - rangeDays)
      const { data, error } = await supabase
        .from('analytics_sessions')
        .select('id, user_id, user_email, user_role, started_at')
        .gte('started_at', from.toISOString())
        .order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SessionRow[]
    },
  })

  const sessions = data ?? []

  const stats = useMemo(() => {
    const uniqueUserIds = new Set(sessions.map(s => s.user_id))
    const todayStr = new Date().toDateString()
    const sessionsToday = sessions.filter(s => new Date(s.started_at).toDateString() === todayStr).length
    return {
      totalSessions: sessions.length,
      uniqueUsers: uniqueUserIds.size,
      avgSessionsPerUser: uniqueUserIds.size > 0 ? sessions.length / uniqueUserIds.size : 0,
      sessionsToday,
    }
  }, [sessions])

  const dailyData = useMemo(() => {
    const byDay = new Map<string, { sessions: number; users: Set<string> }>()
    for (const s of sessions) {
      const day = new Date(s.started_at).toISOString().slice(0, 10)
      if (!byDay.has(day)) byDay.set(day, { sessions: 0, users: new Set() })
      const entry = byDay.get(day)!
      entry.sessions++
      entry.users.add(s.user_id)
    }
    return [...byDay.entries()]
      .map(([day, { sessions, users }]) => ({ day, Sessions: sessions, 'Unique Users': users.size }))
      .sort((a, b) => a.day.localeCompare(b.day))
  }, [sessions])

  const perUser = useMemo(() => {
    const byUser = new Map<string, { email: string; role: string | null; count: number }>()
    for (const s of sessions) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, { email: s.user_email, role: s.user_role, count: 0 })
      byUser.get(s.user_id)!.count++
    }
    return [...byUser.values()].sort((a, b) => b.count - a.count).slice(0, 15)
  }, [sessions])

  const statCards = [
    { label: 'Unique Users', value: stats.uniqueUsers, icon: Users },
    { label: 'Total Sessions', value: stats.totalSessions, icon: Activity },
    { label: 'Avg Sessions / User', value: stats.avgSessionsPerUser.toFixed(1), icon: TrendingUp },
    { label: 'Sessions Today', value: stats.sessionsToday, icon: CalendarDays },
  ]

  return (
    <AppShell title="Analytics — IdeaLab">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Cookieless usage tracking — one session per authenticated app load per browser tab.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                  rangeDays === r
                    ? 'border-transparent bg-[#f97316] text-white'
                    : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 dark:text-[#9a9aa6] hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Last {r}d
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[13px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78]">{label}</span>
                <div className="rounded-lg bg-orange-400/10 p-1.5">
                  <Icon className="h-3.5 w-3.5 text-orange-300" />
                </div>
              </div>
              <div className="text-[26px] font-extrabold tabular-nums leading-none text-gray-900 dark:text-white">
                {isLoading ? '—' : value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Daily chart ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <h2 className="mb-5 text-sm font-bold text-gray-900 dark:text-white">Sessions Over Time</h2>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : dailyData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No sessions recorded yet in this range.</p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="day" stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis allowDecimals={false} stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1108', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Sessions" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Unique Users" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Sessions per user ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <h2 className="mb-5 text-sm font-bold text-gray-900 dark:text-white">Most Active Users</h2>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : perUser.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No sessions recorded yet in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                    {['Email', 'Role', 'Sessions'].map(h => (
                      <th key={h} className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-[#6e6e78] first:pl-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {perUser.map(u => (
                    <tr key={u.email} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-2 first:pl-0 font-mono text-[11px] text-gray-900 dark:text-[#f4f4f6]">{u.email}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6] capitalize">{u.role ?? '—'}</td>
                      <td className="py-3 px-2 font-semibold text-gray-900 dark:text-[#f4f4f6]">{u.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
