import { supabase } from './supabaseClient'

interface NotifyParams {
  targetUserId: string | null | undefined
  title: string
  body: string
  createdByEmail: string
}

// Best-effort in-app notification targeted at a single user (via
// notifications.target_user_id — see migration 07). Silently no-ops when
// there's no linked account (e.g. a request submitted before student_id was
// captured) since that's a normal, expected case, not a failure.
export async function notifyUser({ targetUserId, title, body, createdByEmail }: NotifyParams) {
  if (!targetUserId) return
  try {
    await supabase.from('notifications').insert({
      title,
      body,
      created_by_email: createdByEmail,
      target_user_id: targetUserId,
      is_active: true,
    })
  } catch {
    // notification failures are non-fatal — the Gmail flow is the primary record
  }
}
