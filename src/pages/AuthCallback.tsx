import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useUserType } from '../context/UserTypeContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUserType } = useUserType()
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

        // Test student account — checked before domain rules
        if (email === 'srijanmishra1669@gmail.com') {
          setUserType('student' as any)
          localStorage.setItem('sp-user-type', 'student')
          navigate('/student-dashboard', { replace: true })
          return
        }

        // Test faculty account — checked before domain rules
        if (email === 'mishrasrijan2305@gmail.com') {
          setUserType('faculty' as any)
          localStorage.setItem('sp-user-type', 'faculty')
          navigate('/faculty-dashboard', { replace: true })
          return
        }

        // Block non-OPJU emails
        if (
          !email.endsWith('@opju.edu.in') &&
          !email.endsWith('@opju.ac.in') &&
          email !== 'admin@stockpilot.inc'
        ) {
          await supabase.auth.signOut()
          navigate('/signin?error=blocked', { replace: true })
          return
        }

        if (email.endsWith('@opju.ac.in')) {
          setUserType('faculty' as any)
          localStorage.setItem('sp-user-type', 'faculty')
          navigate('/faculty-dashboard', { replace: true })
          return
        }

        if (email.endsWith('@opju.edu.in')) {
          setUserType('student' as any)
          localStorage.setItem('sp-user-type', 'student')
          navigate('/student-dashboard', { replace: true })
          return
        }

        // admin@stockpilot.inc falls through to /admin (handled by admin login not OAuth)
        navigate('/dashboard', { replace: true })
        return
      }
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkSession, 500)
      } else {
        navigate('/signin', { replace: true })
      }
    }

    checkSession()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-400 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
