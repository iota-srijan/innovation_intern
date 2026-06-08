import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Mirrors the fallback logic in AuthContext — used only when user_roles has no row
function getDefaultRole(email: string): 'student' | 'faculty' | 'blocked' {
  if (email === 'srijanmishra1669@gmail.com') return 'student'
  if (email === 'mishrasrijan2305@gmail.com') return 'faculty'
  if (email.endsWith('@opju.ac.in')) {
    const local = email.split('@')[0]
    const dotIndex = local.indexOf('.')
    if (dotIndex !== -1 && /^[a-zA-Z]{2}\d{2}/.test(local.slice(dotIndex + 1))) {
      return 'student'
    }
    return 'faculty'
  }
  return 'blocked'
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    let attempts = 0
    const maxAttempts = 10

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const email = session.user.email ?? ''

        // Block emails that don't match any allowed domain or known address
        const isAllowed =
          email.endsWith('@opju.ac.in') ||
          email === 'srijanmishra1669@gmail.com' ||
          email === 'mishrasrijan2305@gmail.com'

        if (!isAllowed) {
          await supabase.auth.signOut()
          navigate('/signin?error=blocked', { replace: true })
          return
        }

        // Consult user_roles table first — this respects admin grant/revoke
        let role: 'student' | 'faculty' = 'student'
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('email', email)
            .maybeSingle()

          if (data?.role === 'faculty') {
            role = 'faculty'
          } else if (data?.role === 'student') {
            role = 'student'
          } else {
            // No DB row yet — fall back to domain rules
            const defaultRole = getDefaultRole(email)
            role = defaultRole === 'blocked' ? 'student' : defaultRole
          }
        } catch {
          // DB unreachable — fall back to domain rules
          const defaultRole = getDefaultRole(email)
          role = defaultRole === 'blocked' ? 'student' : defaultRole
        }

        // Upsert into user_roles before navigation so the DB row exists
        // by the time AuthContext reads it on the destination page.
        try {
          const meta = session.user.user_metadata as Record<string, unknown>
          const nameFromMeta: string | null =
            (typeof meta?.full_name === 'string' && meta.full_name ? meta.full_name : null) ??
            (typeof meta?.name === 'string' && meta.name ? meta.name : null) ??
            null

          const { error: upsertError } = await supabase
            .from('user_roles')
            .upsert(
              { user_id: session.user.id, email, role, display_name: nameFromMeta },
              { onConflict: 'user_id', ignoreDuplicates: true }
            )
          // Sync display_name from Google for returning users where it is still null
          if (!upsertError && nameFromMeta) {
            await supabase
              .from('user_roles')
              .update({ display_name: nameFromMeta })
              .eq('user_id', session.user.id)
              .is('display_name', null)
          }
        } catch {
          // Upsert failure must not block login
        }

        localStorage.setItem('sp-user-type', role)

        if (role === 'faculty') {
          navigate('/faculty-dashboard', { replace: true })
        } else {
          navigate('/student-dashboard', { replace: true })
        }
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(() => { void checkSession() }, 500)
      } else {
        navigate('/signin', { replace: true })
      }
    }

    void checkSession()
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
