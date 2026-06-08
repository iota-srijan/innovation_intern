import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string
  created_by_email: string
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [reads, setReads] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [notifRes, readsRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, body, created_by_email, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user.id),
      ])
      setNotifications((notifRes.data ?? []) as Notification[])
      setReads(
        new Set(
          ((readsRes.data ?? []) as { notification_id: string }[]).map(r => r.notification_id)
        )
      )
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const markAsRead = async (notificationId: string) => {
    if (!user || reads.has(notificationId)) return
    const { error } = await supabase
      .from('notification_reads')
      .insert({ notification_id: notificationId, user_id: user.id })
    if (!error) {
      setReads(prev => new Set([...prev, notificationId]))
    }
  }

  const markAllAsRead = async () => {
    if (!user || markingAll) return
    const unreadIds = notifications.filter(n => !reads.has(n.id)).map(n => n.id)
    if (unreadIds.length === 0) return
    setMarkingAll(true)
    try {
      const { error } = await supabase
        .from('notification_reads')
        .insert(unreadIds.map(id => ({ notification_id: id, user_id: user.id })))
      if (error) {
        toast.error('Failed to mark all as read')
      } else {
        setReads(prev => new Set([...prev, ...unreadIds]))
        toast.success('All notifications marked as read')
      }
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter(n => !reads.has(n.id)).length

  return (
    <AppShell title="Notifications">
      <div className="mx-auto max-w-[760px] px-6 pb-24 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">
              Notifications
            </h1>
            {!loading && unreadCount > 0 && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-[#9a9aa6]">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {!loading && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-white/[0.07] disabled:opacity-50"
            >
              {markingAll ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
              <Bell className="h-7 w-7 text-gray-400 dark:text-[#6e6e78]" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No notifications yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              You're all caught up. Check back later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map(n => {
              const isRead = reads.has(n.id)
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left rounded-2xl border transition-all duration-150 cursor-pointer overflow-hidden ${
                    isRead
                      ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108]'
                      : 'border-orange-300/40 dark:border-orange-400/30 bg-orange-50 dark:bg-orange-400/[0.06]'
                  }`}
                  style={!isRead ? { boxShadow: 'inset 4px 0 0 0 #fb923c' } : undefined}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {!isRead && (
                        <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${
                          isRead
                            ? 'text-gray-900 dark:text-[#f4f4f6]'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {n.title}
                        </p>
                        <p className={`mt-1.5 text-sm leading-relaxed ${
                          isRead
                            ? 'text-gray-500 dark:text-[#9a9aa6]'
                            : 'text-gray-700 dark:text-[#c8c8d0]'
                        }`}>
                          {n.body}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-400 dark:text-[#6e6e78]">
                          <span>From: {n.created_by_email}</span>
                          <span>·</span>
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </AppShell>
  )
}
