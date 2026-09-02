import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { SESSION_TRACKING_KEY } from '../lib/analytics'

export function useSessionTracking() {
  const { user, userRole, isRoleLoading } = useAuth()

  useEffect(() => {
    if (isRoleLoading || !user || !userRole) return
    if (sessionStorage.getItem(SESSION_TRACKING_KEY)) return

    // Set before the awaited insert so a second effect run (React StrictMode,
    // or a fast re-render) sees the guard already in place.
    sessionStorage.setItem(SESSION_TRACKING_KEY, '1')

    void (async () => {
      const { error } = await supabase.from('analytics_sessions').insert({
        user_id: user.id,
        user_email: user.email ?? '',
        user_role: userRole,
      })
      // Transient failure (network blip) — clear the guard so the next load retries.
      if (error) sessionStorage.removeItem(SESSION_TRACKING_KEY)
    })()
  }, [user, userRole, isRoleLoading])
}
