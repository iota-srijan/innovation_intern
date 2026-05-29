import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Mirrors the fallback logic in AuthContext — used only when user_roles has no row
function getDefaultRole(email: string): 'student' | 'faculty' | 'blocked' {
  if (email === 'srijanmishra1669@gmail.com') return 'student'
  if (email === 'mishrasrijan2305@gmail.com') return 'faculty'
  if (email.endsWith('@opju.ac.in')) return 'faculty'
  if (email.endsWith('@opju.edu.in')) return 'student'
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
          email.endsWith('@opju.edu.in') ||
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
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
