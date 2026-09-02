import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Activity, TrendingUp, CalendarDays } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { AppShell } from '../components/layout/AppShell'
import { StatCard } from '../components/dashboard/StatCard'
import { supabase } from '../lib/supabaseClient'

interface DailyRow {
  day: string
  sessions: number
  unique_users: number
}

interface TopUserRow {
  user_id: string
  user_email: string
  user_role: string | null
  session_count: number
}

interface OverviewRow {
  total_sessions: number
  unique_users: number
  sessions_today: number
}

const RANGE_OPTIONS = [30, 90] as const
type RangeDays = (typeof RANGE_OPTIONS)[number]

function dateRange(rangeDays: RangeDays) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - rangeDays)
  return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) }
}

export default function AdminAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)
  const { fromDate, toDate } = dateRange(rangeDays)

  // Cookieless: analytics_sessions has one row per authenticated app load per
  // tab (see src/hooks/useSessionTracking.ts). All three queries below are
  // server-side aggregations (see supabase/migrations/10 and 13) — the
  // client never downloads raw session rows, which matters since each row
  // carries a user's email.

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', rangeDays],
    queryFn: async (): Promise<OverviewRow | null> => {
      const { data, error } = await supabase
        .rpc('get_analytics_overview', { from_date: fromDate, to_date: toDate })
      if (error) throw error
      return (data?.[0] as OverviewRow) ?? null
    },
  })

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics-daily', rangeDays],
    queryFn: async (): Promise<DailyRow[]> => {
      const { data, error } = await supabase
        .rpc('get_analytics_summary', { from_date: fromDate, to_date: toDate })
      if (error) throw error
      return (data ?? []) as DailyRow[]
    },
  })

  const { data: topUsersData, isLoading: topUsersLoading } = useQuery({
    queryKey: ['analytics-top-users', rangeDays],
    queryFn: async (): Promise<TopUserRow[]> => {
      const { data, error } = await supabase
        .rpc('get_analytics_top_users', { from_date: fromDate, to_date: toDate, limit_n: 15 })
      if (error) throw error
      return (data ?? []) as TopUserRow[]
    },
  })

  const overview = overviewData
  const dailyChart = (dailyData ?? []).map(r => ({
    day: r.day,
    Sessions: Number(r.sessions),
    'Unique Users': Number(r.unique_users),
  }))
  const topUsers = topUsersData ?? []

  const totalSessions = overview ? Number(overview.total_sessions) : 0
  const uniqueUsers = overview ? Number(overview.unique_users) : 0
  const avgSessionsPerUser = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0
  const sessionsToday = overview ? Number(overview.sessions_today) : 0

  const statCards = [
    { label: 'Unique Users', value: uniqueUsers, icon: Users },
    { label: 'Total Sessions', value: totalSessions, icon: Activity },
    { label: 'Avg Sessions / User', value: avgSessionsPerUser.toFixed(1), icon: TrendingUp },
    { label: 'Sessions Today', value: sessionsToday, icon: CalendarDays },
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
          {statCards.map(({ label, value, icon }) => (
            <StatCard key={label} label={label} value={value} icon={icon} isLoading={overviewLoading} />
          ))}
        </div>

        {/* ── Daily chart ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <h2 className="mb-5 text-sm font-bold text-gray-900 dark:text-white">Sessions Over Time</h2>
          {dailyLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : dailyChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">No sessions recorded yet in this range.</p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
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
          {topUsersLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : topUsers.length === 0 ? (
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
                  {topUsers.map(u => (
                    <tr key={u.user_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-2 first:pl-0 font-mono text-[11px] text-gray-900 dark:text-[#f4f4f6]">{u.user_email}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-[#9a9aa6] capitalize">{u.user_role ?? '—'}</td>
                      <td className="py-3 px-2 font-semibold text-gray-900 dark:text-[#f4f4f6]">{Number(u.session_count)}</td>
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
