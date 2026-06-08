import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, RefreshCw, Trash2 } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

interface SentNotification {
  id: string
  title: string
  body: string
  created_at: string
}

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

export default function AdminNotificationsPage() {
  const { user, adminEmail } = useAuth()

  const [notifTitle, setNotifTitle]         = useState('')
  const [notifBody, setNotifBody]           = useState('')
  const [notifSending, setNotifSending]     = useState(false)
  const [sentNotifs, setSentNotifs]         = useState<SentNotification[]>([])
  const [sentNotifsLoading, setSentNotifsLoading] = useState(true)
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null)

  const [confirmSend, setConfirmSend] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const initRef = useRef(false)

  const fetchSentNotifications = useCallback(async () => {
    setSentNotifsLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setSentNotifs((data ?? []) as SentNotification[])
    } finally {
      setSentNotifsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    fetchSentNotifications()
  }, [fetchSentNotifications])

  const logAudit = useCallback(async (action: string, actionType: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const actorEmail = user?.email ?? session?.user?.email ?? null
      await supabase
        .from('audit_log')
        .insert({ actor_email: actorEmail, action, action_type: actionType })
    } catch {
      // audit failures are non-fatal
    }
  }, [user?.email])

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim() || notifSending) return
    setNotifSending(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: notifTitle.trim(),
          body: notifBody.trim(),
          created_by_email: adminEmail ?? 'admin',
          is_active: true,
        })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Notification sent to all users')
        setNotifTitle('')
        setNotifBody('')
        await fetchSentNotifications()
        await logAudit(`Sent notification: "${notifTitle.trim()}"`, 'CREATE')
      }
    } finally {
      setNotifSending(false)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    if (deletingNotifId) return
    setDeletingNotifId(id)
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: false })
        .eq('id', id)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Notification deleted')
        await fetchSentNotifications()
        await logAudit('Deleted a notification', 'DELETE')
      }
    } finally {
      setDeletingNotifId(null)
    }
  }

  const handleRefresh = () => {
    fetchSentNotifications()
  }

  return (
    <AppShell title="Notifications">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">
        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.12] px-3 py-1.5 text-xs font-semibold text-orange-300">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Admin Notifications</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9aa6]">
              Send notifications to all users and manage active alerts
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

        {/* ── Send Notification ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <div className="mb-5 flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Send Notification</h2>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
              Title <span className="font-normal text-gray-400 dark:text-[#6e6e78]">(max 200 chars)</span>
            </label>
            <input
              type="text"
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value.slice(0, 200))}
              maxLength={200}
              placeholder="Notification title…"
              className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400/60 focus:bg-white dark:focus:bg-white/[0.05]"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
              Body <span className="font-normal text-gray-400 dark:text-[#6e6e78]">(max 1000 chars)</span>
            </label>
            <textarea
              value={notifBody}
              onChange={e => setNotifBody(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={3}
              placeholder="Message body…"
              className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400/60 focus:bg-white dark:focus:bg-white/[0.05]"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setConfirmSend(true)}
              disabled={!notifTitle.trim() || !notifBody.trim() || notifSending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {notifSending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Send to All
            </button>
          </div>
        </div>

        {/* ── Sent Notifications ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sent Notifications</h2>
            {!sentNotifsLoading && (
              <span className="rounded-full border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-[#6e6e78]">
                {sentNotifs.length} active
              </span>
            )}
          </div>

          {sentNotifsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            </div>
          ) : sentNotifs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#6e6e78]">
              No active notifications.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {sentNotifs.map(n => (
                <div key={n.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-[#f4f4f6]">{n.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-gray-500 dark:text-[#9a9aa6]">{n.body}</p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-[#6e6e78]">{timeAgo(n.created_at)}</p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(n.id)}
                    disabled={deletingNotifId === n.id}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-400/30 bg-red-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-red-400 transition hover:bg-red-400/[0.14] disabled:opacity-50"
                  >
                    {deletingNotifId === n.id ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send confirm dialog */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 dark:border-white/8 dark:bg-[#1f1509]">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">Send Notification</h3>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to send this notification to all users?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmSend(false)}
                className="rounded-lg border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-orange-50 dark:bg-white/6 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmSend(false); void handleSendNotification(); }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Send to All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 dark:border-white/8 dark:bg-[#1f1509]">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">Delete Notification</h3>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete this notification?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-orange-50 dark:bg-white/6 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => { 
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  void handleDeleteNotification(id);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
